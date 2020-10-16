import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';
import {Tag} from '@api/model/search/tag-model';
import {SearchQuery} from '@api/model/search/search-response';


@Component({
    selector: 'inspector-tag-remove',
    templateUrl: './tag-remove.component.html',
    styleUrls: ['./tag-remove.component.scss']
})
export class TagRemoveComponent implements OnInit {

    @Input()
    tags: Tag[];

    @Input()
    searchQuery: SearchQuery;

    @Output()
    jobState$: EventEmitter<string> = new EventEmitter<string>(true);

    @Output()
    doneEvent$: EventEmitter<boolean> = new EventEmitter<boolean>(true);

    openDeleteTagsConfirm$: EventEmitter<boolean> = new EventEmitter<boolean>(true);

    tagsToRemove: string[] = [];
    selectedScope: string;

    deleteType: string;
    allTagsSelected: boolean = false;


    constructor(private taggingService: TaggingService) {

    }


    ngOnInit() {
        this.allTagsSelected = false;
        this.selectedScope = DeleteScopes.RESULT;
    }



    toggleTagToRemove(tag: Tag) {
        tag.isSelected = !tag.isSelected;
        const index = this.tagsToRemove.findIndex(x => x === tag.value);
        if (index === -1) {
            this.tagsToRemove.push(tag.value);
        } else {
            this.tagsToRemove.splice(index, 1);
        }
        this.allTagsSelected = this.tagsToRemove.length > 0;
    }


    toggleAllTagToRemove() {
        this.allTagsSelected = !this.allTagsSelected;
        this._markAllTags(this.allTagsSelected);
    }


    removeTagsFromList() {
        this.taggingService.removeTags(this.tagsToRemove);
        this.tagsToRemove = [];
    }


    removeTagsFromResult() {
        this.deleteType = DeleteType.DELETE;
        this.openDeleteTagsConfirm$.emit(true);
    }


    confirmDelete() {
        switch (this.selectedScope) {
            case DeleteScopes.RESULT:
                this._deleteTagsFromResult();
                break;
            case DeleteScopes.COLLECTION:
                this.deleteTagsFromCollection();
                break;

        }
        this._waitUntilJobIsDone();
    }


    cancel() {
        this._resetSelectedTags();

    }


    private _resetSelectedTags() {
        this.openDeleteTagsConfirm$.emit(false);
        this.allTagsSelected = false;
        this._markAllTags(false);
    }


    private _deleteTagsFromResult() {
        this.taggingService.busyEvent$.emit('RUNNING');
        this.taggingService.removeTagsFromResult(this.searchQuery, this.tagsToRemove);
    }


    private deleteTagsFromCollection() {
        const requestAllDocuments: SearchQuery = this._createAllDocumentsRequest();
        this.taggingService.removeTagsFromResult(requestAllDocuments, this.tagsToRemove);
    }


    private _createAllDocumentsRequest(): SearchQuery {
        const searchQueryToDeleteAllTagsFromCollection = this.searchQuery;
        searchQueryToDeleteAllTagsFromCollection.query = '';
        searchQueryToDeleteAllTagsFromCollection.filter = [];
        return searchQueryToDeleteAllTagsFromCollection;
    }


    private _markAllTags(markAsSelected: boolean) {
        this.tags.forEach(tag => {
            tag.isSelected = markAsSelected;
            if (markAsSelected === true) {
                this.tagsToRemove.push(tag.value);
            } else {
                this.tagsToRemove = [];
            }
        });
    }


    private _waitUntilJobIsDone() {
        this.taggingService.jobState$.subscribe(jobState => {
            this.jobState$.emit(jobState);
            if (jobState === 'SUCCEEDED') {
                this._resetSelectedTags();
                this.removeTagsFromList();
                this.taggingService.doneEvent$.emit(true);
                this.doneEvent$.emit(true);
            }
        });
    }


}

export enum DeleteScopes {
    RESULT = 'Result',
    COLLECTION = 'Collection'
}

export enum DeleteType {
    DELETE = 'DELETE'
}
