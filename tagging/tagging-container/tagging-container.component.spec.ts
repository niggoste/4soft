/**
 * Copyright by ayfie on 2020.
 */
import {async, ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {TaggingContainerComponent} from './tagging-container.component';
import {MetaInformation, SearchQuery, SearchResponse} from '@api/model/search/search-response';
import {Tag} from '@api/model/search/tag-model';
import {TaggingService} from '@inspector/search/result/tagging/tagging.service';
import {MockTaggingService} from '@mock/services';
import {tagMock} from '@mock/data';

describe('TaggingContainerComponent', () => {
    let component: TaggingContainerComponent;
    let fixture: ComponentFixture<TaggingContainerComponent>;
    let taggingService: TaggingService;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                TaggingContainerComponent],
            providers: [
                {provide: TaggingService, useClass: MockTaggingService}
            ]
        })
        .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TaggingContainerComponent);
        component = fixture.componentInstance;
        taggingService = TestBed.inject(TaggingService);
        component.searchResponse = {
            searchResult: {
                metaInfo: {totalDocuments: 0}
            },
            aggregationGroups: [
                {
                    aggregations: [{
                        key: 'email',
                        count: 12
                    }],
                    fieldName: 'documentType'
                },
                {
                    aggregations: [{}],
                    fieldName: '_cluster'
                }
            ],
            tags: [tagMock] as Tag[]
        } as SearchResponse;

        component.searchQuery = {
            query: ''
        } as SearchQuery;
        component.tags = [tagMock] as Tag[];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should listen to taggingService.tags$', () => {
        const tagsMock = [{value: 'different tag'}] as Tag[];
        component.ngOnInit();
        taggingService.tags$.next(tagsMock);
        expect(component.tags).toEqual(tagsMock);
    });

    it('should listen to taggingService.busyEvent$', fakeAsync(() => {
        const spy = spyOn(component.jobState$, 'emit');

        component.ngOnInit();
        taggingService.busyEvent$.emit('very busy');
        tick();

        expect(spy).toHaveBeenCalledWith('very busy');
    }));

    it('should emit jobIsDone', () => {
        const spy = spyOn(component.jobIsDone$, 'emit');
        component.taggingIsDone(true);
        expect(spy).toHaveBeenCalledWith(true);
    });

    it('should change value of openEditTagContainer', () => {
        component.openEditTagContainer = false;
        component.displayTaggingContainer(true);
        expect(component.openEditTagContainer).toBe(true);
    });

    it('should listen to openTagContainer$ event', () => {
        const element: HTMLElement = fixture.nativeElement.querySelector('inspector-tag-list');
        const spy = spyOn(component, 'displayTaggingContainer');
        element.dispatchEvent(new Event('displayTaggingContainer$'));

        expect(spy).toHaveBeenCalled();
    });


    describe('totalDocuments > 0', () => {
        beforeEach(() => {
            component.searchResponse.searchResult.metaInfo = {totalDocuments: 1} as MetaInformation;
            fixture.detectChanges();
        });

        it('should render', () => {
            const element = fixture.nativeElement.querySelector('#tag-container');
            expect(element).toBeTruthy();
        });

        describe('openEditTagContainer = false', () => {
            let inspectorTagList: HTMLElement;

            beforeEach(() => {
                component.openEditTagContainer = false;
                fixture.detectChanges();
                inspectorTagList = fixture.nativeElement.querySelector('inspector-tag-list');
            });

            it('should render only inspector-tag-list', () => {
                const tagResult = fixture.nativeElement.querySelector('.left.headline.tag');
                const addTag = fixture.nativeElement.querySelector('.tag-add-container');
                const removeTag = fixture.nativeElement.querySelector('.tag-remove-container');

                expect(inspectorTagList).toBeTruthy();
                expect(tagResult).toBeFalsy();
                expect(addTag).toBeFalsy();
                expect(removeTag).toBeFalsy();
            });

            it('should listen to displayTaggingContainer$ event', () => {
                const spy = spyOn(component, 'displayTaggingContainer');
                inspectorTagList.dispatchEvent(new Event('displayTaggingContainer$'));
                expect(spy).toHaveBeenCalled();
            });
        });

        describe('openEditTagContainer = true', () => {
            let tagResult: HTMLElement;
            let addTag: HTMLElement;
            let removeTag: HTMLElement;

            beforeEach(() => {
                component.openEditTagContainer = true;
                fixture.detectChanges();
                tagResult = fixture.nativeElement.querySelector('.left.headline.tag');
                addTag = fixture.nativeElement.querySelector('.tag-add-container');
            });

            it('should render tagResult, addTag and removeTag', () => {
                component.tags = [{}] as Tag[];
                fixture.detectChanges();
                removeTag = fixture.nativeElement.querySelector('.tag-remove-container');

                expect(tagResult).toBeTruthy();
                expect(addTag).toBeTruthy();
                expect(removeTag).toBeTruthy();
            });

            it('should not render removeTag', () => {
                component.tags = [] as Tag[];
                fixture.detectChanges();
                removeTag = fixture.nativeElement.querySelector('.tag-remove-container');

                expect(removeTag).toBeFalsy();
            });

            it('should render job-state', fakeAsync(() => {
                component.jobState$.emit('RUNNING');
                tick();
                fixture.detectChanges();

                const jobState = tagResult.querySelector('.job-state');
                expect(jobState).toBeTruthy();
            }));

            it('should not render job-state', fakeAsync(() => {
                component.jobState$.emit('NOT RUNNING');
                tick();
                fixture.detectChanges();

                const jobState = tagResult.querySelector('.job-state');
                expect(jobState).toBeFalsy();
            }));

            it('should close call displayTaggingContainer on click', () => {
                const spy = spyOn(component, 'displayTaggingContainer');
                const x: HTMLElement = tagResult.querySelector('.close');
                x.click();

                expect(spy).toHaveBeenCalled();
            });

            it('should listen to doneEvent$ from inspector-tagging', () => {
                const spy = spyOn(component, 'taggingIsDone');
                const inspectorTagging = fixture.nativeElement.querySelector('inspector-tagging');

                inspectorTagging.dispatchEvent(new Event('doneEvent$'));
                expect(spy).toHaveBeenCalled();
            });


            it('should listen to doneEvent$ from inspector-tag-remove', () => {
                const spy = spyOn(component, 'taggingIsDone');
                const inspectorTagging = fixture.nativeElement.querySelector('inspector-tag-remove');

                inspectorTagging.dispatchEvent(new Event('doneEvent$'));
                expect(spy).toHaveBeenCalled();
            });
        });

        describe('test Headline text', () => {
            it ('headline for result', () => {
                expect(component.getHeadlineText()).toBe('Tag Results');
            });

            it ('headline for thread ', () => {
                component.viewMode = 'emailThread';
                expect(component.getHeadlineText()).toBe('Tag all Emails in this Thread');
            });

            it ('headline for selected Emails', () => {
                component.searchQuery.query = 'abc';
                component.viewMode = 'emailThread';
                expect(component.getHeadlineText()).toBe('Tag selected Emails');
            });

        });
    });
});
