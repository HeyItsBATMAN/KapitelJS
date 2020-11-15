interface CreateChapter {
    no?: number;
    title: string;
    timeInSeconds: number;
}
export interface ChapterProperties {
    no: number;
    title: string;
    timeInSeconds: number;
}
declare class Chapter implements ChapterProperties {
    no: number;
    title: string;
    timeInSeconds: number;
    constructor(chapter: CreateChapter);
}
export interface KapitelOptions {
    createChapterButton: boolean;
    exportChaptersButton: boolean;
    showControls: boolean;
    style: Partial<CSSStyleDeclaration>;
}
export declare class Kapitel {
    private media;
    private container;
    private tooltip;
    private dialog;
    private playtime;
    private timeline;
    private totalDuration;
    private firstDraw;
    private currentChapter;
    private chapters;
    private chaptersSubject;
    $chapters: import("rxjs").Observable<Chapter[]>;
    private currentChapterSubject;
    $currentChapter: import("rxjs").Observable<Chapter>;
    private htmlSubject;
    $html: import("rxjs").Observable<HTMLElement>;
    private options;
    constructor(videoElement: HTMLMediaElement, container: HTMLElement, options?: Partial<KapitelOptions>);
    private updateTooltip;
    private createStyleSheet;
    private updateChapters;
    private drawButtons;
    private drawTimeline;
    get playtimePercentage(): string;
    private drawPlaytime;
    private drawControls;
    get currentChapterIndex(): number;
    get nextChapterIndex(): number;
    get prevChapterIndex(): number;
    get hasNextChapter(): boolean;
    get hasPrevChapter(): boolean;
    get nextChapter(): Chapter | undefined;
    get prevChapter(): Chapter | undefined;
    private playNextChapter;
    private playPrevChapter;
    private skip5Seconds;
    private rewind5Seconds;
    private setTotalTime;
    getCurrentVideoTime(): number;
    getVideoDuration(): number;
    private updateCurrentChapter;
    addChapter(chapter: CreateChapter): void;
    addChapters(chapters: Array<CreateChapter>): void;
    removeChapter(chapterNo: number): Chapter | undefined;
    getCurrentFrameAsChapter(): Chapter;
}
export {};
//# sourceMappingURL=kapitel.d.ts.map