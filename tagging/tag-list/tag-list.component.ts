import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Tag} from '@api/model/search/tag-model';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';
import {SearchQuery} from '@api/model/search/search-response';


@Component({
    selector: 'inspector-tag-list',
    templateUrl: './tag-list.component.html',
    styleUrls: ['./tag-list.component.scss']
})
export class TagListComponent implements OnInit {

    @Input()
    tags: Tag[] = [];

    @Input()
    viewMode: string;

    @Input()
    searchQuery: SearchQuery;

    @Output()
    displayTaggingContainer$: EventEmitter<boolean> = new EventEmitter<boolean>(true);


    constructor(private taggingService: TaggingService) {

    }


    ngOnInit() {

    }


    displayTaggingContainer(display: boolean) {
        this.displayTaggingContainer$.emit(display);
    }


    filter(tag: Tag) {
        this.viewMode === 'emailThread' ? this._filterThread(tag) : this._filterResult(tag);
    }


    private _filterResult(tag: Tag) {
        this.taggingService.selectTag(tag);
    }


    private _filterThread(tag: Tag) {
        // TODO: fire filterResult event back to thread and select items there
    }


    getNoTagsText(): string {
        return this.viewMode === 'emailThread' ? 'no tagged Emails in this Thread' : 'no tagged Documents in this Result';
    }


    getTooltipText(): string {
        let tooltipText: string;
        if (this.tags.length > 0) {
            tooltipText = this._createModifyTooltipText();
        } else {
            tooltipText = this._createTooltipText();
        }
        return tooltipText;
    }


    private _createModifyTooltipText(): string {
        let modifyTooltipText = 'Modify Tags for this ';
        if (this.viewMode === 'emailThread') {
            modifyTooltipText = modifyTooltipText.concat('Thread');
        } else {
            modifyTooltipText = modifyTooltipText.concat('Result');
        }
        return modifyTooltipText;
    }


    private _createTooltipText(): string {
        if (this.viewMode === 'emailThread') {
            return this.searchQuery && this.searchQuery.query.length > 0 ? 'Tag selected Emails' : 'Tag all Emails in Thread';
        } else {
            return 'Tag Result';
        }
    }
}
