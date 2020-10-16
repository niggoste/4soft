import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {InspectorMaterialModule} from '@inspector/inspector-material/inspector-material.module';
import {SharedModule} from '@shared/shared.module';
import {TagListComponent} from '@inspector/search/result/tagging/tag-list/tag-list.component';
import { TagRemoveComponent } from '@inspector/search/result/tagging/tag-remove/tag-remove.component';
import { TaggingComponent } from '@inspector/search/result/tagging/tagging/tagging.component';
import { TaggingContainerComponent } from './tagging-container/tagging-container.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SharedModule,
        InspectorMaterialModule
    ],
    declarations: [
        TaggingComponent,
        TagListComponent,
        TagRemoveComponent,
        TaggingContainerComponent
    ],
    exports: [
        TaggingComponent,
        TagListComponent,
        TagRemoveComponent,
        TaggingContainerComponent
    ]
})
export class TaggingModule { }
