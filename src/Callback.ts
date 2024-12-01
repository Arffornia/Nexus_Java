export enum Step {
    FETCHING = "FETCHING",
    DOWNLOADING = "DOWNLOADING",
    EXTRACTING = "EXTRACTING",
    CLEANING = "CLEANING",
    DONE = "DONE"
}

export interface Callback {
    onStep(step: Step): void;
}