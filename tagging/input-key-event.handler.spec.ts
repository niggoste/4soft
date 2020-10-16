/*
 * Copyright (c) ayfie 2019
 */

import {InputKeyEventHandler} from '@inspector/search/result/tagging/input-key-event.handler';

class TestItem {
    id: number;
    isActive: boolean;

    constructor(id: number) {
        this.id = id;
    }
}
describe('InputKeyEventHandlerTest', () => {

    let handler: InputKeyEventHandler;


    beforeEach( () => {
        const testItems: TestItem[] = [];
        for (let i = 0; i < 8; i++) {
            testItems.push(new TestItem(i + 1));
        }
        handler = new InputKeyEventHandler();
        handler.setItems(testItems);
    });


    it('test init', () => {
        expect(handler.getItems().length).toBe(8);
        expect(handler.getActiveItem()).toBeUndefined();
    });

    it('test next', () => {
        callNextXTimes(3);

        const markedIndex = handler.getItems().findIndex(x => x.isActive === true);
        expect(markedIndex).toBe(2);
        expect(handler.getItems()[markedIndex].item.id).toBe(3);
        expect(handler.getActiveItem().item.id).toBe(3);
    });

    it('test next only till last list item', () => {
        callNextXTimes(20);
        const markedIndex = handler.getItems().findIndex(x => x.isActive === true);
        expect(markedIndex).toBe(7);
        expect(handler.getItems()[markedIndex].item.id).toBe(8);
        expect(handler.getActiveItem().item.id).toBe(8);
    });

    it('test previous before next', () => {
        handler.previous();
        expect(handler.getActiveItem()).toBeUndefined();
    });

    it('test previous after next', () => {
        callNextXTimes(4);

        let markedIndex = handler.getItems().findIndex(x => x.isActive === true);
        expect(markedIndex).toBe(3);
        expect(handler.getItems()[markedIndex].item.id).toBe(4);
        expect(handler.getActiveItem().item.id).toBe(4);

        handler.previous();
        markedIndex = handler.getItems().findIndex(x => x.isActive === true);
        expect(markedIndex).toBe(2);
        expect(handler.getItems()[markedIndex].item.id).toBe(3);
        expect(handler.getActiveItem().item.id).toBe(3);
    });

    function callNextXTimes(count: number) {
        for (let i = 0; i < count; i++) {
            handler.next();
        }
    }
});
