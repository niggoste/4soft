/**
 * Copyright by ayfie on 2020.
 */
import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Tag} from '@api/model/search/tag-model';
import {SearchQuery, SearchResponse} from '@api/model/search/search-response';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';


@Component({
    selector: 'inspector-tagging-container',
    templateUrl: './tagging-container.component.html',
    styleUrls: ['./tagging-container.component.scss']
})
export class TaggingContainerComponent implements OnInit {

    @Input()
    tags: Tag [] = [];

    @Input()
    searchResponse: SearchResponse;

    @Input()
    searchQuery: SearchQuery;

    @Input()
    openEditTagContainer$: EventEmitter<boolean>;

    @Input()
    viewMode: string;

    @Output()
    jobIsDone$: EventEmitter<boolean> = new EventEmitter<boolean>(true);

    openEditTagContainer: boolean = false;
    jobState$: EventEmitter<string> = new EventEmitter<string>(true);


    constructor(private taggingService: TaggingService) {

    }


    ngOnInit(): void {
        this.taggingService.tags$.subscribe(tags => {
            this.tags = tags;
        });

        this.taggingService.busyEvent$.subscribe(busy => {
            this.jobState$.emit(busy);
        });

        if (this.openEditTagContainer$) {
            this.openEditTagContainer$.subscribe(value => {
                this.openEditTagContainer = value;
            });
        }
    }


    displayTaggingContainer(event: boolean) {
        this.openEditTagContainer = event;
    }


    taggingIsDone(event: boolean) {
        this.jobIsDone$.emit(event);
    }


    getHeadlineText() {
        if (this.viewMode === 'emailThread') {
            return this.searchQuery.query === '' ? 'Tag all Emails in this Thread' : 'Tag selected Emails';
        }
        return 'Tag Results';
    }
}
