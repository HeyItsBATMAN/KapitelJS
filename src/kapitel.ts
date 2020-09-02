import { ReplaySubject } from 'rxjs';
import tippy, { followCursor, animateFill, hideAll } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';
import slugify from 'slugify';
import Swal from 'sweetalert2';
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

class Chapter implements ChapterProperties {
  no: number;
  title: string;
  timeInSeconds: number;

  constructor(chapter: CreateChapter) {
    const formatTime = (num: number) => {
      const str = `00${num}`;
      return str.substring(str.length - 2);
    };

    this.no = chapter.no ?? 0;
    this.title = chapter.title;
    this.timeInSeconds = chapter.timeInSeconds;
  }
}

interface KapitelOptions {
  createChapterButton: boolean;
  exportChaptersButton: boolean;
  maxHeight: string;
  height: string;
}

export interface KapitelConstructorOptions {
  createChapterButton?: boolean;
  exportChaptersButton?: boolean;
  maxHeight?: string;
  height?: string;
}

export class Kapitel {
  private __media: HTMLMediaElement;
  private __timeline: HTMLElement;

  private __totalDuration = Number.POSITIVE_INFINITY;

  private __currentChapter: Chapter | undefined;
  private __chapters = new Array<Chapter>();
  private __chaptersSubject = new ReplaySubject<Array<Chapter>>(1);
  public $chapters = this.__chaptersSubject.asObservable();
  private __currentChapterSubject = new ReplaySubject<Chapter>(1);
  public $currentChapter = this.__currentChapterSubject.asObservable();
  private __htmlSubject = new ReplaySubject<HTMLElement>(1);
  public $html = this.__htmlSubject.asObservable();

  private __options: KapitelOptions = {
    createChapterButton: false,
    exportChaptersButton: false,
    maxHeight: '25px',
    height: '100%',
  };

  constructor(
    videoElement: HTMLMediaElement,
    container: HTMLElement,
    options?: KapitelConstructorOptions,
  ) {
    this.__media = videoElement;
    this.__timeline = container;

    this.__options = { ...this.__options, ...options };

    this.__timeline.style.display = 'flex';
    this.__timeline.style.flexDirection = 'column';
    this.__timeline.style.justifyContent = 'stretch';
    this.__timeline.style.alignItems = 'center';
    this.__timeline.style.height = this.__options.height;
    this.__timeline.style.maxHeight = this.__options.maxHeight;

    if (this.__media.currentSrc !== '') this.setTotalTime();
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

  private updateChapters() {
    this.__chapters = this.__chapters
      .sort((a, b) => a.timeInSeconds - b.timeInSeconds)
      .map((chapter, index) => {
        chapter.no = index + 1;
        return chapter;
      });
  }

  private drawButtons() {
    const buttonRow = document.createElement('div');
    const buttons = new Array<HTMLButtonElement>();
    buttonRow.id = 'kapiteljs-timeline-buttonrow';
    buttonRow.style.display = 'flex';
    buttonRow.style.flexDirection = 'row';
    buttonRow.style.width = '100%';

    if (this.__options.createChapterButton) {
      const button = document.createElement('button');
      button.innerText = 'Create Chapter';
      button.addEventListener('click', () => {
        const timeInSeconds = this.getCurrentVideoTime();
        Swal.fire({
          title: 'Create a chapter',
          inputPlaceholder: 'Enter a title',
          input: 'text',
          icon: 'info',
          showCancelButton: true,
        }).then(result => {
          if (!result.isConfirmed) return;
          const title = result.value as string;
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
        const json = JSON.stringify(
          this.__chapters.map(chapter => ({
            title: chapter.title,
            no: chapter.no,
            timeInSeconds: chapter.timeInSeconds,
          })),
        );
        Swal.fire({
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

      const oldRow = this.__timeline.children.namedItem(
        'kapiteljs-timeline-buttonrow',
      );
      if (oldRow) oldRow.remove();

      this.__timeline.appendChild(buttonRow);
    }
  }

  private drawTimeline() {
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
      } else {
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
      line.id = slugify(chapter.title, {
        lower: true,
        remove: /[\/*+~,.()'"!:@]/g,
      });
      const tippyRef = tippy(`#${line.id}`, {
        content: chapter.title,
        arrow: true,
        animation: 'scale',
        followCursor: true,
        animateFill: true,
        plugins: [followCursor, animateFill],
        delay: [100, null],
      });

      // Interaction
      line.addEventListener('mouseenter', () => {
        hideAll();
        line.style.background = '#ccc';
        tippyRef.forEach(ref => {
          ref.show();
        });
      });
      line.addEventListener('mouseleave', () => {
        hideAll();
        line.style.background = '#fff';
        tippyRef.forEach(ref => ref.hide());
      });
      line.addEventListener('click', () => {
        this.__media.currentTime = chapter.timeInSeconds;
      });

      div.appendChild(line);
    }

    const oldDiv = this.__timeline.children.namedItem('kapiteljs-timeline-div');
    if (oldDiv) oldDiv.remove();
    this.__timeline.appendChild(div);
    this.__htmlSubject.next(this.__timeline);
  }

  private drawPlaytime() {
    const timeline = this.__timeline.children.namedItem(
      'kapiteljs-timeline-div',
    ) as HTMLDivElement;
    if (!timeline) return;
    let playtime = timeline.children.namedItem(
      'kapiteljs-timeline-playtime',
    ) as HTMLDivElement;

    const percent = (this.getCurrentVideoTime() / this.__totalDuration) * 100;

    if (playtime) {
      playtime.style.width = `${percent}%`;
    } else {
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

  private setTotalTime() {
    if (Number.isNaN(this.__media.duration)) return;
    this.__totalDuration = this.__media.duration;
    this.drawTimeline();
  }

  public getCurrentVideoTime() {
    return this.__media.currentTime;
  }

  public getVideoDuration() {
    if (Number.isNaN(this.__media.duration)) return Number.POSITIVE_INFINITY;
    return this.__media.duration;
  }

  private updateCurrentChapter() {
    const validChapters = this.__chapters.filter(
      chapter => chapter.timeInSeconds <= this.getCurrentVideoTime(),
    );
    const last = validChapters[validChapters.length - 1];
    if (!last) return;
    if (last !== this.__currentChapter) {
      this.__currentChapter = last;
      this.__currentChapterSubject.next(this.__currentChapter);
    }
  }

  public addChapter(chapter: CreateChapter) {
    this.__chapters.push(new Chapter(chapter));
    this.__chaptersSubject.next(this.__chapters);
  }

  public addChapters(chapters: Array<CreateChapter>) {
    for (const chapter of chapters) this.addChapter(chapter);
  }

  public removeChapter(chapterNo: number) {
    const chapterIndex = this.__chapters.findIndex(
      chapter => chapter.no === chapterNo,
    );
    if (chapterIndex === -1) return undefined;
    return this.__chapters.splice(chapterIndex, 1)[0];
  }

  public getCurrentFrameAsChapter() {
    return new Chapter({
      title: 'Current Frame as Chapter',
      timeInSeconds: this.getCurrentVideoTime(),
    });
  }
}
