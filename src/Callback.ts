export enum Step {
    FETCHING = "FETCHING",
    DOWNLOADING = "DOWNLOADING",
    EXTRACTING = "EXTRACTING",
    DONE = "DONE"
}

export interface Callback {
    onStep(step: Step): void;
}