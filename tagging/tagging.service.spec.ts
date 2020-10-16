import {TestBed} from '@angular/core/testing';

import {TaggingService} from './tagging.service';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {EndpointService} from '@shared/endpoint.service';
import {SearchConfigService} from '@shared/search-config/search-config.service';
import {SharedModule} from '@shared/shared.module';
import {Tag} from '@api/model/search/tag-model';
import Spy = jasmine.Spy;
import {SuggestService} from '@api/services/suggest.service';
import {AyfieRequest, RequestBuilder} from '@api/model/search/search-request';
import {DocumentApiService} from '@api/services/document-api.service';
import {of} from 'rxjs';
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {SearchQuery, SearchQueryData} from '@api/model/search/search-response';
import {SortCriterion} from '@api/model/search/sort-criterion';


describe('TaggingService', () => {
    let taggingService: TaggingService;
    let suggestService: SuggestService;
    let documentApiService: DocumentApiService;

    let fakeRequest: AyfieRequest;
    let fakeSearchQuery: SearchQuery;

    const fakeSearchQueryData: SearchQueryData = {
        query: '',
        size: 1,
        excludeDuplicates: 0,
        filters: [],
        offset: 0,
        sort: {} as unknown as SortCriterion,
        highlight: false
    };
    beforeEach(() => TestBed.configureTestingModule({
        imports: [
            HttpClientTestingModule,
            SharedModule
        ],
        providers: [
            EndpointService,
            SearchConfigService,
            DocumentApiService
        ]
    }));

    beforeEach(() => {
        taggingService = TestBed.inject(TaggingService);
        suggestService = TestBed.inject(SuggestService);
        documentApiService = TestBed.inject(DocumentApiService);
        fakeRequest = new AyfieRequest(new RequestBuilder());
        fakeSearchQuery = new SearchQuery(fakeSearchQueryData);
    });


    it('should be created', () => {
        expect(taggingService).toBeTruthy();
    });


    it('setTags', () => {
        const tags = createTestTags();
        taggingService.getTagsOnChanged().subscribe(tags$ => {
            expect(tags$.length).toBe(tags.length);
        });
        taggingService.setTags(tags);
        expect(taggingService.getTags().length).toBe(tags.length);
    });

    it('addTags', () => {
        const tags = createTestTags();
        taggingService.addTags(tags);
        expect(taggingService.getTags().length).toBe(tags.length);
    });


    it('dont add existing tags', () => {
        const tags = createTestTags();
        taggingService.setTags(tags);
        expect(taggingService.getTags().length).toBe(tags.length);

        taggingService.addTags(tags);
        expect(taggingService.getTags().length).toBe(tags.length);
    });


    it('removeTags', () => {
        const tags = createTestTags();
        taggingService.setTags(tags);
        expect(taggingService.getTags().length).toBe(tags.length);

        const tagsToRemove: string[] = [tags[1].value, tags[3].value];
        taggingService.removeTags(tagsToRemove);
        expect(taggingService.getTags().length).toBe(2);
    });


    it('selectTag', () => {
        const tags = createTestTags();
        taggingService.getSelectedTag().subscribe(selectedTag => {
            expect(selectedTag.value).toBe(tags[2].value);
        });
        taggingService.selectTag(tags[2]);
    });


    it('getAsyncTagsBySearch', () => {
        const suggestSpy: Spy = spyOn(suggestService, 'getAsyncTags');
        taggingService.getAsyncTagsBySearch('foo', 'bar');
        expect(suggestSpy).toHaveBeenCalledWith('foo', 'bar');
    });



    it('tagDocuments', () => {
        const headers: HttpHeaders = new HttpHeaders({
            'location': 'foo/bar/jobs/123'
        });
        const httpResponse: HttpResponse<any> = new HttpResponse({headers: headers});
        const partialUpdateByQuerySpy: Spy = spyOn(documentApiService, 'partialUpdateByQuery').and.returnValue(of(httpResponse));
        taggingService.tagDocuments(fakeSearchQuery, ['abcdefg', '']);
        expect(partialUpdateByQuerySpy).toHaveBeenCalled();
    });


    it('removeTagsFromResult', () => {
        const headers: HttpHeaders = new HttpHeaders({
            'location': 'foo/bar/jobs/456'
        });
        const httpResponse: HttpResponse<any> = new HttpResponse({headers: headers});
        const partialUpdateByQuerySpy: Spy = spyOn(documentApiService, 'partialUpdateByQuery').and.returnValue(of(httpResponse));
        taggingService.removeTagsFromResult(fakeSearchQuery, ['abcdefg', '']);
        expect(partialUpdateByQuerySpy).toHaveBeenCalled();
    });


    it('clearTagsInResult', () => {
        const headers: HttpHeaders = new HttpHeaders({
            'location': 'foo/bar/jobs/789'
        });
        const httpResponse: HttpResponse<any> = new HttpResponse({headers: headers});
        const partialUpdateByQuerySpy: Spy = spyOn(documentApiService, 'partialUpdateByQuery').and.returnValue(of(httpResponse));
        taggingService.clearTagsInResult(fakeSearchQuery);
        expect(partialUpdateByQuerySpy).toHaveBeenCalled();
    });



    function createTestTags(): Tag[] {
        const tagsToTest = [];
        tagsToTest.push(new Tag('abc', '111'));
        tagsToTest.push(new Tag('def', '222'));
        tagsToTest.push(new Tag('xyz', '333'));
        tagsToTest.push(new Tag('foo', ''));

        return tagsToTest;
    }
});
