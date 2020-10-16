import {Component, EventEmitter, HostListener, Input, OnInit, Output} from '@angular/core';
import {FormControl} from '@angular/forms';
import {SearchQuery} from '@api/model/search/search-response';
import {Tag} from '@api/model/search/tag-model';
import {FilterService} from '@inspector/search/filter/filter.service';
import {InputKeyEventHandler, InputSuggestItem} from '@inspector/search/result/tagging/input-key-event.handler';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';
import {ImportanceLevel} from '@shared/notification/notification.model';
import {NotificationService} from '@shared/notification/notification.service';
import {SearchConfig} from '@shared/search-config/search-config.model';
import {Subject} from 'rxjs';
import {debounceTime, map} from 'rxjs/operators';
import {InspectorStateService} from '@inspector/inspector-service-children/inspector-state.service';
import {Search} from '@inspector/search/search';
import {DocumentApiService} from '@api/services/document-api.service';


@Component({
    selector: 'inspector-tagging',
    templateUrl: './tagging.component.html',
    styleUrls: ['./tagging.component.scss']
})
export class TaggingComponent implements OnInit {

    @Input()
    searchQuery: SearchQuery;

    @Input()
    tags: Tag[];

    @Input()
    viewMode: string;

    @Output()
    jobState$: EventEmitter<string> = new EventEmitter<string>(true);

    @Output()
    doneEvent$: EventEmitter<boolean> = new EventEmitter<boolean>(true);

    typeControl = new FormControl();
    inputValue: string = '';
    tagCanBeAdded: boolean = false;

    suggestions$: Subject<InputSuggestItem[]> = new Subject<InputSuggestItem[]>();

    suggestIsOpen$: EventEmitter<boolean> = new EventEmitter<boolean>(true);
    tagsToAdd: Tag[] = [];
    joinedTag: Tag;
    searchConfig: SearchConfig;

    _suggestedTagsFromSearch: Tag[] = [];
    keyboardEventHandler: InputKeyEventHandler = new InputKeyEventHandler();


    constructor(private taggingService: TaggingService,
                private filterService: FilterService,
                private inspectorStateService: InspectorStateService,
                private notificationService: NotificationService,
                private documentApiService: DocumentApiService) {

    }


    ngOnInit() {
        this.keyboardEventHandler = new InputKeyEventHandler();
        this.searchConfig = this.inspectorStateService.searchConfig;
        this.inspectorStateService.searchResponse$.subscribe(() => {
            this._clearInputValue();
            this._suggestedTagsFromSearch = [];
        });

        this.initFormInputControl();
    }


    @HostListener('keyup', ['$event'])
    public onKeyUp(keyupEvent: KeyboardEvent): void {
        if (keyupEvent.key === 'ArrowDown') {
            this._selectNext();
        }

        if (keyupEvent.key === 'ArrowUp') {
            this._selectPrevious();
        }

        if (keyupEvent.key === 'Enter') {
            this.handleEnterKeyDown();
        }
    }


    initFormInputControl() {
        this.suggestions$.next([]);
        this.typeControl.valueChanges.pipe(debounceTime(50)).subscribe(term => {
            this.inputValue = term ? term.trim() : '';
            this.tagCanBeAdded = term && term.trim().length > 1;

            if (this.inputValue && this.inputValue.length > 0) {
                this._getTagsBySearch(term);
            } else {
                this.initTagSuggestions();
            }
        });
    }


    initTagSuggestions() {
        if (this.inputValue.length > 0) {
            this._getTagsBySearch(this.inputValue);
        }
        if (this._suggestedTagsFromSearch.length === 0) {
            if (this.searchQuery.query && this.searchQuery.query !== '') {
                this._suggestedTagsFromSearch.push(new Tag(this.searchQuery.query, 'Search Term'));
            }

            this.filterService.filters.forEach(filter => {
                this._suggestedTagsFromSearch.push(new Tag((filter.exclude ? 'NOT ' : '') + filter.valueDisplay, 'Filter ' + filter.keyDisplay));
            });

            this._suggestedTagsFromSearch.forEach((tag: Tag) => {
                tag.isSelected = this.tagsToAdd.findIndex(x => x.value === tag.value) !== -1;
            });

            this.suggestIsOpen$.emit(this._suggestedTagsFromSearch.length > 0);
            this.keyboardEventHandler.setItems(this._suggestedTagsFromSearch);
            this.suggestions$.next(this.keyboardEventHandler.getItems());
        }
    }


    closeSuggestResult() {
        this.suggestIsOpen$.emit(false);
        this._suggestedTagsFromSearch = [];
        this.suggestions$.next([]);
    }


    selectExistingTag(selectedTag: Tag) {
        this._addTagToTagList(selectedTag);
        this.tagCanBeAdded = false;
    }


    createNewTagFromInput() {
        const newTag = new Tag(this.inputValue, '');
        this._addTagToTagList(newTag);
        this._clearInputValue();
        this.tagCanBeAdded = false;
    }


    removeTagFromListToAdd(tag: Tag) {
        const index = this.tagsToAdd.findIndex(x => x.value === tag.value);
        if (index !== -1) {
            tag.isSelected = false;
            this.tagsToAdd.splice(index, 1);
        }
    }


    tagResult() {
        // TODO: REMOVE this if clause after legal week in 02/2020
        /*
            We need to do tag result for similar and concept search this way, because 'partial update by query'
            works only with search endpoint.
         */
        const searchType = this.inspectorStateService.currentSearch.type;
        if (searchType === Search.SEARCH_TYPE_SIMILAR || searchType === Search.SEARCH_TYPE_CONCEPT) {
            const tags: string[] = [];
            this.tagsToAdd.forEach(tagToAdd => {
                tags.push(tagToAdd.value);
            });

            let count = 0;
            this.inspectorStateService.currentSearch.searchResponse.searchResult.hits.forEach(resultItem => {
                const request = JSON.stringify({tag: tags});

                this.documentApiService.updateDocument(resultItem.document, request).subscribe(response => {
                    count++;
                    if (count === this.inspectorStateService.currentSearch.searchResponse.searchResult.hits.length) {
                        this.jobState$.emit('SUCCEEDED');
                        this.tagsToAdd = [];
                        this.doneEvent$.emit(true);
                        this.taggingService.doneEvent$.emit(true);
                    }
                });
            });
        } else {
            const existingTags = this._detectExistingTags();
            this.taggingService.busyEvent$.emit('RUNNING');

            if (existingTags.length > 0) {
                this.taggingService.removeTagsFromResult(this.searchQuery, this._extractValuesFromTags(existingTags));
                const deleteJobState$ = this.taggingService.jobState$;
                deleteJobState$.subscribe(jobState => {
                    if (jobState === 'SUCCEEDED') {
                        deleteJobState$.unsubscribe();
                        this._addTagsToResult();
                    } else {
                        this.jobState$.emit(jobState);
                    }
                });

            } else {
                this._addTagsToResult();
            }
        }
    }


    joinTags() {
        this.joinedTag = new Tag('', '');
        this.tagsToAdd.forEach(tag => {
            this._appendToJoinedTag(tag);
        });
        this.tagsToAdd = [this.joinedTag];
    }


    cancel() {
        this.tagsToAdd = [];
        this._clearInputValue();
    }


    private handleEnterKeyDown() {
        if (this.inputValue.trim() !== '') {
            this._selectActive();
        } else {
            this.notificationService.openSpecialNotification(
                {
                    data: {title: 'Notification', message: 'You can not create empty tag'},
                    duration: 2500,
                    importanceLevel: ImportanceLevel.Information
                });
        }
    }


    private _addTagsToResult() {
        this.taggingService.tagDocuments(this.searchQuery, this._extractValuesFromTags(this.tagsToAdd));
        const addJobState$ = this.taggingService.jobState$;

        addJobState$.subscribe(state => {
            this.jobState$.emit(state);
            if (state === 'SUCCEEDED') {
                this.tagsToAdd = this.tagsToAdd.map(tag => {
                    tag.isSelected = false;
                    return tag;
                });
                this.tagsToAdd = [];
                addJobState$.unsubscribe();
                this.doneEvent$.emit(true);
                this.taggingService.doneEvent$.emit(true);
            }
        });
    }


    private _addTagToTagList(tag: Tag) {
        const index = this.tagsToAdd.findIndex(x => x.value === tag.value);
        if (index === -1) {
            setTimeout(() => tag.isSelected = true);
            this.tagsToAdd.push(tag);
        }
    }


    _getTagsBySearch(token: string) {
        this.inputValue = token;
        const observableOfTags = this.taggingService.getAsyncTagsBySearch(this.searchQuery.query, token)
        .pipe(map(modifiedAsyncTags => {
            const isTagNotAdded = this.tagsToAdd.findIndex(x => x.value === this.inputValue) === -1;
            const isTagNotCreated = modifiedAsyncTags.findIndex(x => x.value === this.inputValue) === -1;
            this.tagCanBeAdded = isTagNotAdded && isTagNotCreated;

            return modifiedAsyncTags.map(asyncTag => {
                asyncTag.isSelected = this.tagsToAdd.findIndex(x => x.value === asyncTag.value) !== -1;
                asyncTag.source = asyncTag.source + ' Tagged Documents in tis collection';
                return asyncTag;
            });
        }));

        const tagSuggestResult: Tag[] = [];
        observableOfTags.subscribe(changedTags => {
            tagSuggestResult.push(...changedTags);
            tagSuggestResult.push(...this._suggestedTagsFromSearch);

            this.suggestIsOpen$.emit(tagSuggestResult.length > 0);
            this.keyboardEventHandler.setItems(tagSuggestResult);
            this.suggestions$.next(this.keyboardEventHandler.getItems());
        });
    }


    private _extractValuesFromTags(tags: Tag[]): string[] {
        const extractedValues: string[] = [];
        tags.forEach(tag => {
            extractedValues.push(tag.value);
        });
        return extractedValues;
    }


    private _clearInputValue() {
        this.inputValue = '';
        this.typeControl.reset();
    }


    private _detectExistingTags(): Tag[] {
        const existingTags = this.tagsToAdd.map((tag: Tag) => {
            return this.tags.find(x => x.value === tag.value);
        });
        return existingTags.filter(x => x !== undefined);
    }


    private _selectNext() {
        this.keyboardEventHandler.next();
        this.suggestions$.next(this.keyboardEventHandler.getItems());
    }


    private _selectPrevious() {
        this.keyboardEventHandler.previous();
        this.suggestions$.next(this.keyboardEventHandler.getItems());
    }


    private _selectActive() {
        if (this.keyboardEventHandler.getActiveItem()) {
            this.selectExistingTag(this.keyboardEventHandler.getActiveItem().item);
        } else {
            this.createNewTagFromInput();
        }
    }


    private _appendToJoinedTag(tag: Tag) {
        if (this.joinedTag.value.length > 0) {
            this.joinedTag.value = this.joinedTag.value.concat(' - ');
        }
        this.joinedTag.value = this.joinedTag.value.concat(tag.value);
    }


    getTagButtonText(): string {
        return this.viewMode === 'emailThread' ? 'Tag Emails' : 'Tag Results';
    }
}
