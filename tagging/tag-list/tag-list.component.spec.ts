import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {TagListComponent} from './tag-list.component';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {SuggestService} from '@api/services/suggest.service';
import {EndpointService} from '@shared/endpoint.service';
import {SearchConfigService} from '@shared/search-config/search-config.service';
import {ErrorService} from '@shared/error/error.service';
import {InspectorMaterialModule} from '@inspector/inspector-material/inspector-material.module';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';
import {Tag} from '@api/model/search/tag-model';
import Spy = jasmine.Spy;
import {SharedModule} from '@shared/shared.module';
import {SearchQuery} from '@api/model/search/search-response';

describe('TagListComponentTest', () => {
    let component: TagListComponent;
    let fixture: ComponentFixture<TagListComponent>;
    let taggingService: TaggingService;
    let tags: Tag[] = [];

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                InspectorMaterialModule,
                SharedModule
            ],
            providers: [
                SuggestService,
                EndpointService,
                SearchConfigService,
                ErrorService
            ],
            declarations: [
                TagListComponent]
        })
        .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TagListComponent);
        component = fixture.componentInstance;
        component.searchQuery = {
            query: ''
        } as SearchQuery;
        taggingService = fixture.debugElement.injector.get(TaggingService);
        createTags();
        fixture.detectChanges();
    });


    it('should create', () => {
        expect(component).toBeTruthy();
    });


    it('add tags to taggingService', () => {
        component.tags = tags;
        expect(component.tags.length).toBe(5);
    });


    it('displayTaggingContainer', () => {
        component.displayTaggingContainer$.subscribe(value => {
            expect(value).toBeTruthy();
        });
        component.displayTaggingContainer(true);
    });


    it('filter', () => {
        const spy: Spy = spyOn(taggingService, 'selectTag');
        component.filter(tags[1]);
        expect(spy).toHaveBeenCalled();
    });

    describe('test Tooltip text', () => {
        it ('Tooltip for result', () => {
            expect(component.getTooltipText()).toBe('Tag Result');
        });

        it ('Tooltip for thread ', () => {
            component.viewMode = 'emailThread';
            expect(component.getTooltipText()).toBe('Tag all Emails in Thread');
        });

        it ('Tooltip for selected Emails', () => {
            component.searchQuery.query = 'abc';
            component.viewMode = 'emailThread';
            expect(component.getTooltipText()).toBe('Tag selected Emails');
        });
    });

    describe('test no tags Text', () => {
        it ('no tags text for result', () => {
            expect(component.getNoTagsText()).toBe('no tagged Documents in this Result');
        });

        it ('no tags text for thread', () => {
            component.viewMode = 'emailThread';
            expect(component.getNoTagsText()).toBe('no tagged Emails in this Thread');
        });
    });

    function createTags() {
        tags = [];
        for (let i = 0; i < 5; i++) {
            tags.push(new Tag('abc_' + i, 'any source'));
        }
    }
});
