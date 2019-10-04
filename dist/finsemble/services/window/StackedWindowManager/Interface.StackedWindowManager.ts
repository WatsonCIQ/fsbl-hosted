/**
 * DIAGRAM: https://realtimeboard.com/app/board/o9J_kzFZvJ0=/?moveToWidget=3074457346145087095
 */


// Window Service internal interfaces for StackedWindowManager
export interface StackedWindowManagement {
	addWindow(params: any, callback: Function): void;
	removeWindow(params: any, callback: Function): void;
	deleteWindow(params: any, callback: Function): void;
	setVisibleWindow(params: any, callback: Function): void;
	reorder(params: any, callback: Function): void;
}