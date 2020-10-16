import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';

import {DeleteScopes, TagRemoveComponent} from './tag-remove.component';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {EndpointService} from '@shared/endpoint.service';
import {JobApiService} from '@api/services/job-api.service';
import {SearchConfigService} from '@shared/search-config/search-config.service';

import {InspectorMaterialModule} from '@inspector/inspector-material/inspector-material.module';
import {SharedModule} from '@shared/shared.module';
import {InspectorService} from '@inspector/inspector.service';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';
import {RouterTestingModule} from '@angular/router/testing';
import {NgxPageScrollModule} from 'ngx-page-scroll';
import {SimilarSearchService} from '@inspector/search/service/similar-search.service';
import {Tag} from '@api/model/search/tag-model';
import Spy = jasmine.Spy;
import {SearchQuery} from '@api/model/search/search-response';
import {SortCriterion} from '@api/model/search/sort-criterion';


describe('TagRemoveComponentTest', () => {
    let component: TagRemoveComponent;
    let fixture: ComponentFixture<TagRemoveComponent>;
    let tags: Tag[] = [];
    let taggingService: TaggingService;

    const mockSearchQuery = new SearchQuery({query: '',
        size: 1,
        excludeDuplicates: 0,
        filters: [],
        offset: 0,
        sort: {} as unknown as SortCriterion,
        highlight: false});

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                InspectorMaterialModule,
                SharedModule,
                RouterTestingModule,
                NgxPageScrollModule
            ],
            providers: [
                EndpointService,
                JobApiService,
                SearchConfigService,
                InspectorService,
                TaggingService,
                SimilarSearchService
            ],
            declarations: [
                TagRemoveComponent
            ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TagRemoveComponent);
        component = fixture.componentInstance;
        component.searchQuery = mockSearchQuery;
        taggingService = fixture.debugElement.injector.get(TaggingService);
        createTags();
        fixture.detectChanges();
    });


    it('should create', () => {
        expect(component).toBeTruthy();
    });


    it('toggleTagToRemove', () => {
        const tag: Tag = new Tag('abc', '123');
        component.toggleTagToRemove(tag);
        expect(component.tagsToRemove.length).toBe(1);
        expect(component.tagsToRemove[0]).toBe('abc');
        expect(tag.isSelected).toBeTruthy();
        component.toggleTagToRemove(tag);
        expect(component.tagsToRemove.length).toBe(0);
        expect(tag.isSelected).toBeFalsy();
    });


    it('toggleAllTagToRemove', () => {
        component.tags = tags;
        component.toggleAllTagToRemove();
        expect(component.allTagsSelected).toBeTruthy();
        expect(component.tagsToRemove.length).toBe(5);

        component.toggleAllTagToRemove();
        expect(component.allTagsSelected).toBeFalsy();
        expect(component.tagsToRemove.length).toBe(0);
    });


    it('removeTagsFromResult', () => {
        component.tags = tags;
        component.toggleAllTagToRemove();
        const openDeleteTagsConfirm$Spy: Spy = spyOn(component.openDeleteTagsConfirm$, 'emit');

        component.removeTagsFromResult();
        expect(openDeleteTagsConfirm$Spy).toHaveBeenCalledWith(true);
    });

    describe('confirmDelete', () => {
        let removeTagsFromResultSpy: Spy;
        let busyEventSpy: Spy;

        beforeEach(() => {
           removeTagsFromResultSpy = spyOn(taggingService, 'removeTagsFromResult');
           busyEventSpy = spyOn(taggingService.busyEvent$, 'emit');
        });

        it('should remove tags from result', () => {
            component.selectedScope = DeleteScopes.RESULT;
            component.confirmDelete();
            expect(removeTagsFromResultSpy).toHaveBeenCalled();
            expect(busyEventSpy).toHaveBeenCalledWith('RUNNING');
        });

        it('should delete tags From collection', () => {
            component.selectedScope = DeleteScopes.COLLECTION;
            component.confirmDelete();
            expect(removeTagsFromResultSpy).toHaveBeenCalled();
            expect(busyEventSpy).not.toHaveBeenCalled();
        });

        describe('waiting until job is done', () => {
            let doneEventSpy: Spy;

            beforeEach(() => {
                doneEventSpy = spyOn(taggingService.doneEvent$, 'emit');
            });

            it('should listen to jobState$', fakeAsync(() => {
                const jobStateSpy = spyOn(component.jobState$, 'emit');

                component.confirmDelete();
                taggingService.jobState$.emit('RUNNING');
                tick();

                expect(jobStateSpy).toHaveBeenCalledWith('RUNNING');
                expect(doneEventSpy).not.toHaveBeenCalled();
            }));

            it('should inform that job was finished', fakeAsync(() => {
                const finalJobState = 'SUCCEEDED';
                const jobStateSpy = spyOn(component.jobState$, 'emit');
                const resetSelectedTagsSpy = spyOn<any>(component, '_resetSelectedTags');
                const removeTagsFromListSpy = spyOn(component, 'removeTagsFromList');

                component.confirmDelete();
                taggingService.jobState$.emit(finalJobState);
                tick();

                expect(jobStateSpy).toHaveBeenCalledWith(finalJobState);
                expect(resetSelectedTagsSpy).toHaveBeenCalled();
                expect(removeTagsFromListSpy).toHaveBeenCalled();
                expect(doneEventSpy).toHaveBeenCalledWith(true);
            }));
        });
    });



    it('cancel', () => {
        component.tags = tags;
        component.toggleAllTagToRemove();
        expect(component.allTagsSelected).toBeTruthy();
        expect(component.tagsToRemove.length).toBe(5);
        const openDeleteTagsConfirm$Spy: Spy = spyOn(component.openDeleteTagsConfirm$, 'emit');

        component.cancel();
        expect(openDeleteTagsConfirm$Spy).toHaveBeenCalledWith(false);
        expect(component.allTagsSelected).toBeFalsy();
        expect(component.tagsToRemove.length).toBe(0);
        component.tags.forEach(tag => {
            expect(tag.isSelected).toBeFalsy();
        });
    });

    it('should remove tags from list', () => {
        const spy = spyOn(taggingService, 'removeTags');
        const tagsArray = ['one', 'two', 'three'];
        component.tagsToRemove = tagsArray;

        component.removeTagsFromList();

        expect(spy).toHaveBeenCalledWith(tagsArray);
        expect(component.tagsToRemove).toEqual([]);
    });


    function createTags() {
        tags = [];
        for (let i = 0; i < 5; i++) {
            tags.push(new Tag('abc_' + i, 'any source'));
        }
    }
});
