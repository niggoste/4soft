/*
 * Copyright (c) ayfie 2019
 */

export class InputSuggestItem {
    isActive: boolean = false;
    item: any;


    constructor(item: any) {
        this.item = item;
    }
}

export class InputKeyEventHandler {
    private items: InputSuggestItem[] = [];
    private activeItemIndex: number;


    constructor() {

    }


    setItems(items: any[]) {
        this.items = [];
        items.forEach(item => {
            this.items.push(new InputSuggestItem(item));
        });

        this.activeItemIndex = -1;
        this._resetAllItems();
    }


    getItems(): any[] {
        return this.items;
    }


    next() {
        this._markNextItemAsActive();
    }


    previous() {
        this._markPreviousItemAsActive();
    }


    private _markNextItemAsActive() {
        if (this._itemsAvailable()) {
            if (!this._isLastActive()) {
                this.activeItemIndex++;
            }

            if (this.activeItemIndex < this.items.length) {
                this._resetAllItems();
                this._markItemAsActiveByIndex();
            }
        }
    }


    private _markPreviousItemAsActive() {
        if (this._itemsAvailable()) {
            if (this.activeItemIndex > 0) {
                this.activeItemIndex--;
            }

            if (this.activeItemIndex >= 0) {
                this._resetAllItems();
                this._markItemAsActiveByIndex();
            }
        }
    }


    private _itemsAvailable(): boolean {
        return this.items !== undefined && this.items.length > 0;
    }


    getActiveItem(): any {
        return this.items.find(x => x.isActive);
    }


    private _isLastActive(): boolean {
        return !(this.activeItemIndex < this.items.length - 1);
    }


    private _markItemAsActiveByIndex() {
        this.items[this.activeItemIndex].isActive = true;
    }


    private _resetAllItems() {
        const activeItem = this.getActiveItem();
        if (activeItem) {
            activeItem.isActive = false;
        }
    }
}
