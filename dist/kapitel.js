"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kapitel = void 0;
const rxjs_1 = require("rxjs");
const tippy_js_1 = __importStar(require("tippy.js"));
require("tippy.js/dist/tippy.css");
require("tippy.js/dist/backdrop.css");
require("tippy.js/animations/shift-away.css");
const slugify_1 = __importDefault(require("slugify"));
const sweetalert2_1 = __importDefault(require("sweetalert2"));
require("sweetalert2/src/sweetalert2.scss");
class Chapter {
    constructor(chapter) {
        var _a;
        const formatTime = (num) => {
            const str = `00${num}`;
            return str.substring(str.length - 2);
        };
        this.no = (_a = chapter.no) !== null && _a !== void 0 ? _a : 0;
        this.title = chapter.title;
        this.timeInSeconds = chapter.timeInSeconds;
    }
}
class Kapitel {
    constructor(videoElement, container, options) {
        this.__totalDuration = Number.POSITIVE_INFINITY;
        this.__chapters = new Array();
        this.__chaptersSubject = new rxjs_1.ReplaySubject(1);
        this.$chapters = this.__chaptersSubject.asObservable();
        this.__currentChapterSubject = new rxjs_1.ReplaySubject(1);
        this.$currentChapter = this.__currentChapterSubject.asObservable();
        this.__htmlSubject = new rxjs_1.ReplaySubject(1);
        this.$html = this.__htmlSubject.asObservable();
        this.__options = {
            createChapterButton: false,
            exportChaptersButton: false,
            maxHeight: '25px',
            height: '100%',
        };
        this.__media = videoElement;
        this.__timeline = container;
        this.__options = Object.assign(Object.assign({}, this.__options), options);
        this.__timeline.style.display = 'flex';
        this.__timeline.style.flexDirection = 'column';
        this.__timeline.style.justifyContent = 'stretch';
        this.__timeline.style.alignItems = 'center';
        this.__timeline.style.height = this.__options.height;
        this.__timeline.style.maxHeight = this.__options.maxHeight;
        if (this.__media.currentSrc !== '')
            this.setTotalTime();
        this.__media.onloadeddata = () => this.setTotalTime();
        this.__media.onprogress = () => this.setTotalTime();
        this.__media.ontimeupdate = () => {
            this.updateCurrentChapter();
            this.drawPlaytime();
        };
        this.$chapters.subscribe(() => {
            this.updateChapters();
            this.drawTimeline();
            this.drawButtons();
        });
    }
    updateChapters() {
        this.__chapters = this.__chapters
            .sort((a, b) => a.timeInSeconds - b.timeInSeconds)
            .map((chapter, index) => {
            chapter.no = index + 1;
            return chapter;
        });
    }
    drawButtons() {
        const buttonRow = document.createElement('div');
        const buttons = new Array();
        buttonRow.id = 'kapiteljs-timeline-buttonrow';
        buttonRow.style.display = 'flex';
        buttonRow.style.flexDirection = 'row';
        buttonRow.style.width = '100%';
        if (this.__options.createChapterButton) {
            const button = document.createElement('button');
            button.innerText = 'Create Chapter';
            button.addEventListener('click', () => {
                const timeInSeconds = this.getCurrentVideoTime();
                sweetalert2_1.default.fire({
                    title: 'Create a chapter',
                    inputPlaceholder: 'Enter a title',
                    input: 'text',
                    icon: 'info',
                    showCancelButton: true,
                }).then(result => {
                    if (!result.isConfirmed)
                        return;
                    const title = result.value;
                    this.addChapter({
                        title,
                        timeInSeconds,
                    });
                });
            });
            buttons.push(button);
        }
        if (this.__options.exportChaptersButton) {
            const button = document.createElement('button');
            button.innerText = 'Export chapters';
            button.addEventListener('click', () => {
                const json = JSON.stringify(this.__chapters.map(chapter => ({
                    title: chapter.title,
                    no: chapter.no,
                    timeInSeconds: chapter.timeInSeconds,
                })));
                sweetalert2_1.default.fire({
                    title: 'Export chapters',
                    icon: 'success',
                    html: `<textarea style="width: 100%; resize: none; min-height: 250px;">${json}</textarea>`,
                    confirmButtonText: 'Thanks!',
                });
            });
            buttons.push(button);
        }
        if (buttons.length > 0) {
            for (const button of buttons) {
                button.style.width = '100%';
                buttonRow.appendChild(button);
            }
            const oldRow = this.__timeline.children.namedItem('kapiteljs-timeline-buttonrow');
            if (oldRow)
                oldRow.remove();
            this.__timeline.appendChild(buttonRow);
        }
    }
    drawTimeline() {
        const chapters = this.__chapters;
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.width = '100%';
        div.style.height = '100%';
        div.id = 'kapiteljs-timeline-div';
        const createBar = () => {
            const bar = document.createElement('div');
            bar.style.width = '0.5vw';
            bar.style.height = '100%';
            bar.style.position = 'absolute';
            return bar;
        };
        // Chapters
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            let timeToNextChapter = 0;
            if (chapters[i + 1]) {
                timeToNextChapter =
                    chapters[i + 1].timeInSeconds - chapter.timeInSeconds;
            }
            else {
                timeToNextChapter = this.__totalDuration - chapter.timeInSeconds;
            }
            const percent = (chapter.timeInSeconds / this.__totalDuration) * 100;
            const line = createBar();
            line.style.top = '50%';
            line.style.transform = 'translateY(-50%)';
            line.style.left = `${percent}%`;
            line.style.outline = 'gray 0.1rem solid';
            line.style.background = '#fff';
            line.style.transition = 'all 250ms';
            const widthToNext = (timeToNextChapter / this.__totalDuration) * 100;
            if (!Number.isNaN(widthToNext) && widthToNext > 0) {
                line.style.width = `${widthToNext}%`;
            }
            // Tooltip
            line.id = slugify_1.default(chapter.title, {
                lower: true,
                remove: /[\/*+~,.()'"!:@]/g,
            });
            const tippyRef = tippy_js_1.default(`#${line.id}`, {
                content: chapter.title,
                arrow: true,
                animation: 'scale',
                followCursor: true,
                animateFill: true,
                plugins: [tippy_js_1.followCursor, tippy_js_1.animateFill],
                delay: [100, null],
            });
            // Interaction
            line.addEventListener('mouseenter', () => {
                tippy_js_1.hideAll();
                line.style.background = '#ccc';
                tippyRef.forEach(ref => {
                    ref.show();
                });
            });
            line.addEventListener('mouseleave', () => {
                tippy_js_1.hideAll();
                line.style.background = '#fff';
                tippyRef.forEach(ref => ref.hide());
            });
            line.addEventListener('click', () => {
                this.__media.currentTime = chapter.timeInSeconds;
            });
            div.appendChild(line);
        }
        const oldDiv = this.__timeline.children.namedItem('kapiteljs-timeline-div');
        if (oldDiv)
            oldDiv.remove();
        this.__timeline.appendChild(div);
        this.__htmlSubject.next(this.__timeline);
    }
    drawPlaytime() {
        const timeline = this.__timeline.children.namedItem('kapiteljs-timeline-div');
        if (!timeline)
            return;
        let playtime = timeline.children.namedItem('kapiteljs-timeline-playtime');
        const percent = (this.getCurrentVideoTime() / this.__totalDuration) * 100;
        if (playtime) {
            playtime.style.width = `${percent}%`;
        }
        else {
            playtime = document.createElement('div');
            playtime.id = 'kapiteljs-timeline-playtime';
            playtime.style.filter = 'opacity(0.2)';
            playtime.style.pointerEvents = 'none';
            playtime.style.width = `${percent}%`;
            playtime.style.position = 'absolute';
            playtime.style.background = 'green';
            playtime.style.height = '10%';
            playtime.style.top = '50%';
            playtime.style.transform = 'translateY(-50%)';
            playtime.style.transition = 'all 250ms';
            timeline.appendChild(playtime);
        }
    }
    setTotalTime() {
        if (Number.isNaN(this.__media.duration))
            return;
        this.__totalDuration = this.__media.duration;
        this.drawTimeline();
    }
    getCurrentVideoTime() {
        return this.__media.currentTime;
    }
    getVideoDuration() {
        if (Number.isNaN(this.__media.duration))
            return Number.POSITIVE_INFINITY;
        return this.__media.duration;
    }
    updateCurrentChapter() {
        const validChapters = this.__chapters.filter(chapter => chapter.timeInSeconds <= this.getCurrentVideoTime());
        const last = validChapters[validChapters.length - 1];
        if (!last)
            return;
        if (last !== this.__currentChapter) {
            this.__currentChapter = last;
            this.__currentChapterSubject.next(this.__currentChapter);
        }
    }
    addChapter(chapter) {
        this.__chapters.push(new Chapter(chapter));
        this.__chaptersSubject.next(this.__chapters);
    }
    addChapters(chapters) {
        for (const chapter of chapters)
            this.addChapter(chapter);
    }
    removeChapter(chapterNo) {
        const chapterIndex = this.__chapters.findIndex(chapter => chapter.no === chapterNo);
        if (chapterIndex === -1)
            return undefined;
        return this.__chapters.splice(chapterIndex, 1)[0];
    }
    getCurrentFrameAsChapter() {
        return new Chapter({
            title: 'Current Frame as Chapter',
            timeInSeconds: this.getCurrentVideoTime(),
        });
    }
}
exports.Kapitel = Kapitel;
//# sourceMappingURL=kapitel.js.map