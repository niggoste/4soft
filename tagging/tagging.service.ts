/**
 * Copyright by ayfie on 2020.
 */
import { EventEmitter, Injectable } from '@angular/core';
import { PartialUpdateRequest, TagMethods } from '@api/model/search/partial-update-request';
import { Tag } from '@api/model/search/tag-model';
import { DocumentApiService } from '@api/services/document-api.service';
import { JobApiService } from '@api/services/job-api.service';
import { SuggestService } from '@api/services/suggest.service';
import { EndpointService } from '@shared/endpoint.service';
import { Observable, Subject, Subscription, timer } from 'rxjs';
import {SearchQuery} from '@api/model/search/search-response';

@Injectable({
    providedIn: 'root'
})
export class TaggingService {

    static TAG_FIELD_NAME = 'tag';
    static GET_JOB_STATE_INTERVAL = 500;
    static START_GET_JOB_STATE = 10;

    updateSubscription: Subscription;

    jobState$: EventEmitter<string> = new EventEmitter<string>(true);
    doneEvent$: EventEmitter<boolean> = new EventEmitter<boolean>(true);
    busyEvent$: EventEmitter<string> = new EventEmitter<string>(true);

    tags$: Subject<Tag[]> = new Subject<Tag[]>();
    private _tags$: Subject<Tag[]> = new Subject<Tag[]>();
    private _selectedTagOnChange$: Subject<Tag> = new Subject<Tag>();

    private _tags: Tag[] = [];


    constructor(private documentApiService: DocumentApiService,
                private endpointService: EndpointService,
                private jobApiService: JobApiService,
                private suggestService: SuggestService) {

    }


    selectTag(tag: Tag) {
        this._selectedTagOnChange$.next(tag);
    }

    getSelectedTag(): Observable<Tag> {
        return this._selectedTagOnChange$;
    }


    setTags(tags: Tag[]) {
        this._tags = tags;
        this._tags$.next(tags);
    }


    getTags(): Tag[] {
        return this._tags;
    }


    addTags(tags: Tag[]) {
        tags.forEach(tagToAdd => {
            if (!this._tags.find(x => x.value === tagToAdd.value)) {
                this._tags.push(tagToAdd);
            }
        });
        this._tags$.next(this._tags);
    }


    removeTags(tags: string[]) {
        tags.forEach(tag => {
            const index = this._tags.findIndex(x => x.value === tag);
            if (index !== -1) {
                this._tags.splice(index, 1);
            }
        });
        this._tags$.next(this._tags);
    }


    getTagsOnChanged(): Observable<Tag[]> {
        return this._tags$;
    }


    getAsyncTagsBySearch(searchQuery: string, token): Observable<Tag[]> {
        return this.suggestService.getAsyncTags(searchQuery, token);
    }


    tagDocuments(searchQuery: SearchQuery, tagsToAdd: string[]) {
        const tagToAddRequest: PartialUpdateRequest = new PartialUpdateRequest(
            searchQuery,
            TagMethods.APPEND,
            TaggingService.TAG_FIELD_NAME,
            tagsToAdd);

        const response$ = this.documentApiService.partialUpdateByQuery(this.endpointService.documentEndpoint, tagToAddRequest);
        this._handleResponse(response$);
    }


    removeTagsFromResult(searchQuery: SearchQuery, tagsToRemove: string[]) {
        const tagToAddRequest: PartialUpdateRequest = new PartialUpdateRequest(
            searchQuery,
            TagMethods.DELETE,
            TaggingService.TAG_FIELD_NAME,
            tagsToRemove);
        const response$ = this.documentApiService.partialUpdateByQuery(this.endpointService.documentEndpoint, tagToAddRequest);
        this._handleResponse(response$);
    }


    clearTagsInResult(searchQuery: SearchQuery) {
        const clearTagsRequest: PartialUpdateRequest = new PartialUpdateRequest(
            searchQuery,
            TagMethods.CLEAR,
            TaggingService.TAG_FIELD_NAME,
            []);

        const response$ = this.documentApiService.partialUpdateByQuery(this.endpointService.documentEndpoint, clearTagsRequest);
        this._handleResponse(response$);
    }


    private _handleResponse(response$) {
        response$.subscribe(httpResponse => {
            if (httpResponse.headers) {
                const jobId = httpResponse.headers.get('location').split('jobs/')[1];
                this._getJobState(jobId);
            }
        });
    }


    private _getJobState(jobId: string) {
        const timerObservable = timer(TaggingService.START_GET_JOB_STATE, TaggingService.GET_JOB_STATE_INTERVAL);
        this.updateSubscription = timerObservable.subscribe(() => {
            this.jobApiService.getJobDetail(jobId).subscribe(job => {
                this.jobState$.emit(job.state);
                if (job.state === 'SUCCEEDED' || job.state === 'FAILED') {
                    this.updateSubscription.unsubscribe();
                    this.jobState$ = new EventEmitter(true);
                }
            });
        });
    }

}
