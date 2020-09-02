import 'tippy.js/dist/tippy.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';
import 'sweetalert2/src/sweetalert2.scss';
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
export interface KapitelConstructorOptions {
    createChapterButton?: boolean;
    exportChaptersButton?: boolean;
    maxHeight?: string;
    height?: string;
}
export declare class Kapitel {
    private __media;
    private __timeline;
    private __totalDuration;
    private __currentChapter;
    private __chapters;
    private __chaptersSubject;
    $chapters: import("rxjs").Observable<Chapter[]>;
    private __currentChapterSubject;
    $currentChapter: import("rxjs").Observable<Chapter>;
    private __htmlSubject;
    $html: import("rxjs").Observable<HTMLElement>;
    private __options;
    constructor(videoElement: HTMLMediaElement, container: HTMLElement, options?: KapitelConstructorOptions);
    private updateChapters;
    private drawButtons;
    private drawTimeline;
    private drawPlaytime;
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