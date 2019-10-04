/**
 * DIAGRAM: https://realtimeboard.com/app/board/o9J_kzFZvJ0=/?moveToWidget=3074457346145087095
 */

import { TrackingStopReason } from "../ServiceEntryPoints/Interface_Window";

export type Consumed = boolean;

// Window Service internal interface for region handlers
export interface RegionHandler {
	enableRegion(params: Params): Promise<any>;
	triggerAt(coordinates: Coordinates): Consumed;
	stop(reason: TrackingStopReason): void;
	exit(): void;
}

