import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {SearchQuery, SearchResponse} from '@api/model/search/search-response';
import {Tag} from '@api/model/search/tag-model';
import {Filter} from '@inspector/search/filter/filter-model';
import {FilterService} from '@inspector/search/filter/filter.service';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';
import {SimilarSearchService} from '@inspector/search/service/similar-search.service';
import {searchResponseData} from '@mock/mock-search-result';
import {mockSearchConfigData} from '@mock/search-config';
import {
    MockDocumentApiService,
    MockInspectorService,
    MockInspectorStateService,
    MockNotificationService,
    MockSearchConfigService,
    MockSimilarSearchService,
    MockTaggingService
} from '@mock/services';
import {NotificationService} from '@shared/notification/notification.service';
import {SearchConfig} from '@shared/search-config/search-config.model';
import {SearchConfigService} from '@shared/search-config/search-config.service';
import {of} from 'rxjs';
import {TaggingComponent} from './tagging.component';
import {InspectorService} from '@inspector/inspector.service';
import {InspectorStateService} from '@inspector/inspector-service-children/inspector-state.service';
import {DocumentApiService} from '@api/services/document-api.service';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import Spy = jasmine.Spy;
import {SortCriterion} from '@api/model/search/sort-criterion';

describe('TaggingComponent', () => {
    let component: TaggingComponent;
    let fixture: ComponentFixture<TaggingComponent>;
    let taggingService: TaggingService;
    let filterService: FilterService;
    let filters: Filter[] = [];
    let notificationService: NotificationService;
    let inspectorStateService: InspectorStateService;
    const mockResponse: SearchResponse = new SearchResponse(searchResponseData, new SearchConfig(mockSearchConfigData));
    const mockQuery: SearchQuery = new SearchQuery({
        query: 'foo',
        size: 1,
        excludeDuplicates: 0,
        filters: [],
        offset: 0,
        sort: {} as unknown as SortCriterion,
        highlight: false});

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                TaggingComponent
            ],
            providers: [
                {provide: TaggingService, useClass: MockTaggingService},
                FilterService,
                {provide: InspectorService, useClass: MockInspectorService},
                {provide: InspectorStateService, useClass: MockInspectorStateService},
                {provide: DocumentApiService, useClass: MockDocumentApiService},
                {provide: SimilarSearchService, useClass: MockSimilarSearchService},
                {provide: NotificationService, useClass: MockNotificationService},
                {provide: SearchConfigService, useClass: MockSearchConfigService}
            ],
            schemas: [NO_ERRORS_SCHEMA]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TaggingComponent);
        component = fixture.componentInstance;
        taggingService = fixture.debugElement.injector.get(TaggingService);
        filterService = fixture.debugElement.injector.get(FilterService);
        notificationService = fixture.debugElement.injector.get(NotificationService);
        inspectorStateService = fixture.debugElement.injector.get(InspectorStateService);
        createFilters();
        filterService.setFilters(filters);
        fixture.detectChanges();
        component.searchQuery = mockQuery;
    });


    it('should create', () => {
        expect(component).toBeTruthy();
    });


    it('initTagSuggestions', () => {
        component.initTagSuggestions();
        expect(component._suggestedTagsFromSearch.length).toBe(5);
    });

    it('should listen for new searchResponse and clear inputValue and suggestedTags when it changes', () => {
        const spy = spyOn(component.typeControl, 'reset');
        component.inputValue = 'whatever';
        component._suggestedTagsFromSearch = [{}, {}] as Tag[];
        inspectorStateService.searchResponse$.next(mockResponse);

        expect(component.inputValue).toBe('');
        expect(component._suggestedTagsFromSearch).toEqual([]);
        expect(spy).toHaveBeenCalled();
    });


    it('closeSuggestResult', () => {
        component.closeSuggestResult();
        expect(component._suggestedTagsFromSearch.length).toBe(0);
    });


    it('selectExistingTag', () => {
        component.initTagSuggestions();
        component.selectExistingTag(component._suggestedTagsFromSearch[2]);
        expect(component.tagsToAdd.length).toBe(1);
        expect(component.tagsToAdd[0].value).toBe('NOT a1');

        component.selectExistingTag(component._suggestedTagsFromSearch[2]);
        expect(component.tagsToAdd.length).toBe(1);
    });


    it('createNewTagFromInput', () => {
        component.createNewTagFromInput();
        expect(component.tagsToAdd.length).toBe(1);
    });


    it('test join tags', () => {
        for (let i = 0; i <= 3; i++) {
            const tag: Tag = new Tag(i, 'x' + i);
            component.tagsToAdd.push(tag);
        }
        expect(component.tagsToAdd.length === 3);
        component.joinTags();
        expect(component.tagsToAdd.length === 1);
        expect(component.tagsToAdd[0].value).toBe('0 - 1 - 2 - 3');
    });


    it('removeTagFromListToAdd', () => {
        component.initTagSuggestions();
        for (let i = 0; i <= 2; i++) {
            component.selectExistingTag(component._suggestedTagsFromSearch[i]);
        }
        expect(component.tagsToAdd.length).toBe(3);
        component.removeTagFromListToAdd(component.tagsToAdd[1]);
        expect(component.tagsToAdd.length).toBe(2);
    });

    describe('tagResult', () => {
        it('tagResult with no existing tags', () => {
            component.tags = [];
            fixture.detectChanges();
            const tagDocumentsSpy: Spy = spyOn(taggingService, 'tagDocuments');
            const removeTagsFromResultSpy: Spy = spyOn(taggingService, 'removeTagsFromResult');
            component.tagResult();
            expect(tagDocumentsSpy).toHaveBeenCalled();
            expect(removeTagsFromResultSpy).not.toHaveBeenCalled();
        });


        describe('removing existing tags', () => {
            let addTagToResultsSpy: Spy;

            beforeEach(() => {
                addTagToResultsSpy = spyOn<any>(component, '_addTagsToResult');
                component.initTagSuggestions();
                component.tags = [component._suggestedTagsFromSearch[1]];
                component.tagsToAdd = component._suggestedTagsFromSearch;
                fixture.detectChanges();
            });

            it('tagResult with existing tags should first remove existing tags', () => {
                const removeTagsFromResultSpy: Spy = spyOn(taggingService, 'removeTagsFromResult');
                component.tagResult();
                expect(removeTagsFromResultSpy).toHaveBeenCalled();
            });

            it('should emit jobState$', fakeAsync(() => {
                const jobStateSpy = spyOn(component.jobState$, 'emit');

                component.tagResult();
                taggingService.jobState$.emit('RUNNING');
                tick();

                expect(jobStateSpy).toHaveBeenCalledWith('RUNNING');
                expect(addTagToResultsSpy).not.toHaveBeenCalled();
            }));

            it('should call _addTagsToResult when job succeeded', fakeAsync(() => {
                component.tagResult();
                taggingService.jobState$.emit('SUCCEEDED');
                tick();

                expect(addTagToResultsSpy).toHaveBeenCalled();
            }));
        });
    });


    describe('listening to addJobState', () => {
        let doneEventSpy: Spy;

        beforeEach(() => {
            component.tags = [];
            doneEventSpy = spyOn(taggingService.doneEvent$, 'emit');
        });

        it('should listen to jobState$', fakeAsync(() => {
            const jobStateSpy = spyOn(component.jobState$, 'emit');

            component.tagResult();
            taggingService.jobState$.emit('RUNNING');
            tick();

            expect(jobStateSpy).toHaveBeenCalledWith('RUNNING');
            expect(doneEventSpy).not.toHaveBeenCalled();
        }));

        it('should inform that job was finished', fakeAsync(() => {
            component.tagsToAdd = [{}, {}, {}] as Tag[];
            const finalJobState = 'SUCCEEDED';
            const jobStateSpy = spyOn(component.jobState$, 'emit');

            component.tagResult();
            taggingService.jobState$.emit(finalJobState);
            tick();

            expect(component.tagsToAdd).toEqual([]);
            expect(jobStateSpy).toHaveBeenCalledWith(finalJobState);
            expect(doneEventSpy).toHaveBeenCalledWith(true);
        }));
    });

    it('cancel', () => {
        component.cancel();
        expect(component.tagsToAdd.length).toBe(0);
    });


    it('test async get existing tags by input', () => {
        const testValue = 'New York';
        const existingTags: Tag[] = [];
        existingTags.push(new Tag('New Jersy', '345'));
        existingTags.push(new Tag('New Jeans', '501'));

        component.suggestions$.subscribe(tags => {
            console.log(component.inputValue);
            console.log('foo ' + tags.length);
        });

        const getAsyncTagsBySearchSpy: Spy = spyOn(taggingService, 'getAsyncTagsBySearch').and.returnValue(of(existingTags));

        fixture.detectChanges();
        component._getTagsBySearch(testValue);
        fixture.detectChanges();
        expect(getAsyncTagsBySearchSpy).toHaveBeenCalled();
        expect(component.inputValue).toBe(testValue);
    });

    it('should call _getTagsBySearch', () => {
        const spy = spyOn(component, '_getTagsBySearch');
        component.inputValue = 'some text';
        component.initTagSuggestions();
        expect(spy).toHaveBeenCalledWith('some text');
    });

    describe('keyup listener and handlers', () => {
        it('should execute next on ArrowDown', () => {
            const spyEventHandler = spyOn<any>(component.keyboardEventHandler, 'next');
            const spySuggestions = spyOn(component.suggestions$, 'next');

            fixture.debugElement.triggerEventHandler('keyup', {key: 'ArrowDown'});

            expect(spyEventHandler).toHaveBeenCalled();
            expect(spySuggestions).toHaveBeenCalled();
        });

        it('should execute previous on ArrowUp', () => {
            const spyEventHandler = spyOn<any>(component.keyboardEventHandler, 'previous');
            const spySuggestions = spyOn(component.suggestions$, 'next');

            fixture.debugElement.triggerEventHandler('keyup', {key: 'ArrowUp'});

            expect(spyEventHandler).toHaveBeenCalled();
            expect(spySuggestions).toHaveBeenCalled();
        });

        describe('on Enter', () => {
            function pressEnter() {
                fixture.debugElement.triggerEventHandler('keyup', {key: 'Enter'});
            }

            it('should call notificationService.openSpecialNotification', () => {
                const spy = spyOn(notificationService, 'openSpecialNotification');
                component.inputValue = '';
                pressEnter();
                expect(spy).toHaveBeenCalled();
            });

            describe('when inputValue is not empty', () => {
                beforeEach(() => {
                    component.inputValue = 'a new tag';
                });

                it('should call selectExistingTag on Enter', () => {
                    spyOn(component.keyboardEventHandler, 'getActiveItem').and.returnValue({});
                    const spy = spyOn(component, 'selectExistingTag');
                    pressEnter();
                    expect(spy).toHaveBeenCalled();
                });

                it('should call createNewTagFromInput on Enter', () => {
                    spyOn(component.keyboardEventHandler, 'getActiveItem').and.returnValue(undefined);
                    const spy = spyOn(component, 'createNewTagFromInput');
                    pressEnter();
                    expect(spy).toHaveBeenCalled();
                });
            });
        });
    });

    describe('initFormInputControl', () => {
        it('should trim the term and call _getTagsBySearch', fakeAsync(() => {
            const spy = spyOn<any>(component, '_getTagsBySearch');
            fixture.debugElement.componentInstance.typeControl.setValue('   some term     ');
            tick(100);
            expect(component.inputValue).toBe('some term');
            expect(component.tagCanBeAdded).toBe(true);
            expect(spy).toHaveBeenCalledWith('   some term     ');
        }));

        it('should set input value to empty string and call initTagSuggestions', fakeAsync(() => {
            const spy = spyOn(component, 'initTagSuggestions');
            fixture.debugElement.componentInstance.typeControl.setValue(' ');
            tick(100);
            expect(component.inputValue).toBe('');
            expect(component.tagCanBeAdded).toBe(false);
            expect(spy).toHaveBeenCalledWith();
        }));
    });


    function createFilters() {
        filters = [];
        for (let i = 0; i <= 3; i++) {
            const filter: Filter = new Filter();
            filter.keyDisplay = 'a'.concat(i.toString(2));
            filter.valueDisplay = 'a'.concat(i.toString(2));
            if (i === 1) {
                filter.exclude = true;
            }
            filters.push(filter);
        }
    }
})
;
