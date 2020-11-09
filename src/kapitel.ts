import { ReplaySubject, fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

const kapitelCss = `.kapitel {
  display: grid;
  grid-template-areas: 'timeline' 'controls' 'button-row';
  grid-auto-columns: 1fr;
  place-items: center;

  padding: 1rem;

  font-family: system, -apple-system, '.SFNSText-Regular', 'San Francisco',
    'Roboto', 'Segoe UI', 'Helvetica Neue', 'Lucida Grande', sans-serif;
}

.timeline {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 1rem;

  border: solid black 0.1rem;
  border-radius: 0.3rem;
  overflow: hidden;

  grid-area: timeline;
}

.timeline .chapter {
  width: 0.5vw;
  height: 100%;

  position: absolute;
  top: 50%;
  left: 0;

  transform: translateY(-50%);
  background: #fff;
  transition: all 250ms;
}

.timeline .chapter + .chapter {
  border-left: dashed black 0.1rem;
}

.timeline .chapter:hover {
  background: #ccc;
}

.timeline .playtime {
  pointer-events: none;
  position: absolute;
  height: 100%;
  transition: all 125ms;
  background: rgba(0, 0, 0, 0.1);
  outline: black solid 0.1rem;
  z-index: 1;
}

.kapitel .button-row {
  display: flex;
  flex-direction: row;
  width: 100%;
  grid-area: button-row;
}

.kapitel .button-row button {
  padding: 0.5rem;
  font-size: 1rem;
  font-weight: 300;
  width: 100%;
  transition: all 250ms;
  outline: solid white 0.1rem;
  text-transform: uppercase;
}

.kapitel .button-row button + button {
  margin-left: 0.5rem;
}

.kapitel .button-row button:hover {
  outline: solid black 0.1rem;
}

.kapitel .kapitel-tooltip {
  position: absolute;
  background: white;
  color: black;
  padding: 0.2rem 0.4rem;
  transition: opacity 125ms;
  transform: translateX(-50%) translateY(-150%);
  opacity: 0;
  outline: solid black 0.1rem;
  pointer-events: none;
  z-index: 99;
  text-transform: uppercase;
  font-weight: 300;
}

.kapitel .kapitel-tooltip.visible {
  opacity: 1;
}

.kapitel .controls {
  grid-area: controls;
  display: flex;
  margin: 0.5rem 0;
  width: 100%;
  justify-content: space-evenly;
  border: solid black 0.1rem;
  border-radius: 0.3rem;
  padding: 0.2rem 0;
}

.kapitel button {
  background: white;
  color: black;
  border: black solid 0.1rem;
  border-radius: 0;
  cursor: pointer;
}

.kapitel .controls .control-button {
  border: white solid 0.1rem;
  display: grid;
  place-items: center;
  transition: all 250ms;
}

.kapitel .controls .control-button:hover {
  border: black solid 0.1rem;
}

.kapitel .kapitel-dialog {
  position: fixed;
  top: 50vh;
  left: 50vw;
  min-width: 30vw;
  min-height: 20vh;
  max-width: 50vw;
  max-height: 50vh;
  background: white;
  transform: translateX(-50%) translateY(-50%);
  opacity: 0;
  transition: all 125ms;
  border: solid black 0.1rem;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  justify-content: space-between;
  text-align: center;
}

.kapitel .kapitel-dialog h1 {
  margin-top: 0;
  font-weight: 500;
}

.kapitel .kapitel-dialog button {
  padding: 0.5rem;
  text-transform: uppercase;
}

.kapitel .kapitel-dialog textarea {
  resize: none;
  flex-grow: 1;
}

.kapitel .kapitel-dialog.visible {
  opacity: 1;
  z-index: 99;
  pointer-events: all;
}

.kapitel .control-select-container {
  display: flex;
  align-items: center;
}

.kapitel .control-select-container .control-select {
  cursor: pointer;
  appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  background: white;
  border: none;
  padding: 0.1rem;
  margin-left: 0.5rem;
  color: black;
}

.kapitel .control-container {
  position: relative;
}

.kapitel .control-container:before {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-100%);
  background: white;
  outline: solid black 0.1rem;
  content: attr(data-label);
  height: auto;
  color: black;
  padding: 0.2rem;
  text-transform: uppercase;
  text-align: center;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: all 125ms ease-out;
  pointer-events: none;
  font-weight: 300;
  z-index: 3;
}

.kapitel .control-container:hover:before {
  opacity: 1;
  transform: translateX(-50%) translateY(-110%);
}
`;

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

export interface KapitelOptions {
  createChapterButton: boolean;
  exportChaptersButton: boolean;
  showControls: boolean;
  style: Partial<CSSStyleDeclaration>;
}

export class Kapitel {
  private media: HTMLMediaElement;
  private container: HTMLElement;
  private tooltip = document.createElement('div');
  private dialog = document.createElement('div');
  private playtime = document.createElement('div');
  private timeline = document.createElement('div');

  private totalDuration = Number.POSITIVE_INFINITY;
  private firstDraw = true;

  private currentChapter: Chapter | undefined;
  private chapters = new Array<Chapter>();
  private chaptersSubject = new ReplaySubject<Array<Chapter>>(1);
  public $chapters = this.chaptersSubject.asObservable();
  private currentChapterSubject = new ReplaySubject<Chapter>(1);
  public $currentChapter = this.currentChapterSubject.asObservable();
  private htmlSubject = new ReplaySubject<HTMLElement>(1);
  public $html = this.htmlSubject.asObservable();

  private options: KapitelOptions = {
    createChapterButton: true,
    exportChaptersButton: true,
    showControls: true,
    style: {
      minHeight: '1rem',
    },
  };

  constructor(
    videoElement: HTMLMediaElement,
    container: HTMLElement,
    options?: Partial<KapitelOptions>,
  ) {
    this.media = videoElement;
    this.container = container;

    this.options = { ...this.options, ...options };

    this.container.classList.add('kapitel');
    this.tooltip.classList.add('kapitel-tooltip');
    this.container.appendChild(this.tooltip);
    this.dialog.classList.add('kapitel-dialog');
    this.container.appendChild(this.dialog);
    this.playtime.id = 'kapiteljs-timeline-playtime';
    this.playtime.classList.add('playtime');
    this.playtime.style.width = this.playtimePercentage;
    this.timeline.appendChild(this.playtime);
    this.timeline.id = 'kapiteljs-timeline-div';
    this.timeline.classList.add('timeline');
    this.container.appendChild(this.timeline);

    if (this.options.style) {
      for (const [key, value] of Object.entries(this.options.style)) {
        (this.container.style as any)[key] = value;
      }
    }

    if (this.media.currentSrc !== '') this.setTotalTime();
    fromEvent(this.media, 'loadeddata').subscribe(() => this.setTotalTime());
    fromEvent(this.media, 'progress').subscribe(() => this.setTotalTime());

    fromEvent(this.media, 'timeupdate')
      .pipe(throttleTime(250))
      .subscribe(() => {
        this.updateCurrentChapter();
        this.drawPlaytime();
      });

    this.$chapters.subscribe(() => {
      this.updateChapters();
      this.drawButtons();
      this.drawTimeline();
    });

    fromEvent<MouseEvent>(document, 'mousemove').subscribe(event => {
      this.updateTooltip(event);
    });

    this.drawButtons();

    if (this.options.showControls) {
      this.drawControls();
    }

    this.createStyleSheet();
  }

  private updateTooltip(event: MouseEvent) {
    if (!this.tooltip.classList.contains('visible')) return;
    const { clientX, clientY } = event;
    this.tooltip.style.top = clientY + 'px';
    this.tooltip.style.left = clientX + 'px';
  }

  private createStyleSheet() {
    const style = document.createElement('style');
    style.type = 'text/css';

    style.innerHTML = kapitelCss;

    document.head.appendChild(style);
  }

  private updateChapters() {
    this.chapters = this.chapters
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
    buttonRow.classList.add('button-row');

    if (this.options.createChapterButton) {
      const button = document.createElement('button');
      button.innerText = 'Create Chapter';
      fromEvent(button, 'click').subscribe(() => {
        const timeInSeconds = this.getCurrentVideoTime();

        const heading = document.createElement('h1');
        heading.innerText = 'Create a chapter';
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'chapter-name';
        input.placeholder = 'Chapter name';
        const addButton = document.createElement('button');
        addButton.innerText = 'Add';
        const cancelButton = document.createElement('button');
        cancelButton.innerText = 'Cancel';

        this.dialog.innerHTML = '';
        [heading, input, addButton, cancelButton].forEach(el =>
          this.dialog.appendChild(el),
        );

        fromEvent(addButton, 'click').subscribe(() => {
          this.addChapter({
            title: input.value.trim(),
            timeInSeconds,
          });
          this.dialog.classList.remove('visible');
        });

        fromEvent(cancelButton, 'click').subscribe(() => {
          this.dialog.classList.remove('visible');
        });

        this.dialog.classList.add('visible');
      });
      buttons.push(button);
    }

    if (this.options.exportChaptersButton) {
      const button = document.createElement('button');
      button.innerText = 'Export chapters';
      fromEvent(button, 'click').subscribe(() => {
        const json = JSON.stringify(
          this.chapters.map(chapter => ({
            title: chapter.title,
            no: chapter.no,
            timeInSeconds: chapter.timeInSeconds,
          })),
        );

        const heading = document.createElement('h1');
        heading.innerText = 'Export chapters';
        const textarea = document.createElement('textarea');
        textarea.innerText = json;
        const closeButton = document.createElement('button');
        closeButton.innerText = 'Thanks!';

        this.dialog.innerHTML = '';
        [heading, textarea, closeButton].forEach(el =>
          this.dialog.appendChild(el),
        );

        fromEvent(closeButton, 'click').subscribe(() => {
          this.dialog.classList.remove('visible');
        });
        this.dialog.classList.add('visible');
      });
      buttons.push(button);
    }

    if (buttons.length > 0) {
      for (const button of buttons) {
        buttonRow.appendChild(button);
      }

      const oldRow = this.container.children.namedItem(
        'kapiteljs-timeline-buttonrow',
      );
      if (oldRow) oldRow.remove();

      this.container.appendChild(buttonRow);
    }
  }

  private drawTimeline() {
    const chapters = this.chapters;

    this.timeline
      .querySelectorAll('.chapter')
      .forEach(chapter => chapter.remove());

    // Chapters
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      let timeToNextChapter = 0;
      if (chapters[i + 1]) {
        timeToNextChapter =
          chapters[i + 1].timeInSeconds - chapter.timeInSeconds;
      } else {
        timeToNextChapter = this.totalDuration - chapter.timeInSeconds;
      }

      const percent = (chapter.timeInSeconds / this.totalDuration) * 100;
      const line = document.createElement('div');

      line.style.left = `${percent}%`;
      const widthToNext = (timeToNextChapter / this.totalDuration) * 100;
      if (!Number.isNaN(widthToNext) && widthToNext > 0) {
        line.style.width = `${widthToNext}%`;
      }

      const tooltipContent = `${chapter.title}`;

      fromEvent(line, 'mouseenter').subscribe(() => {
        this.tooltip.innerHTML = tooltipContent;
        this.tooltip.classList.add('visible');
      });
      fromEvent(line, 'mouseleave').subscribe(() => {
        this.tooltip.classList.remove('visible');
      });
      fromEvent(line, 'click').subscribe(() => {
        this.media.currentTime = chapter.timeInSeconds;
      });

      line.classList.add('chapter');
      this.timeline.appendChild(line);
    }

    this.htmlSubject.next(this.container);
  }

  get playtimePercentage() {
    return (this.getCurrentVideoTime() / this.totalDuration) * 100 + '%';
  }

  private drawPlaytime() {
    this.playtime.style.width = this.playtimePercentage;
  }

  private drawControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('controls');

    const button = (icon_name: string, label: string) => {
      const buttonElement = document.createElement('div');
      buttonElement.classList.add('control-button');
      buttonElement.setAttribute('role', 'button');

      const url = `https://fonts.gstatic.com/s/i/materialiconssharp/${icon_name}/v6/24px.svg`;
      const img = document.createElement('img');
      img.classList.add('icon');
      img.src = url;

      buttonElement.appendChild(img);

      buttonElement.classList.add('control-container');
      buttonElement.setAttribute('data-label', label);

      return { container: buttonElement, input: buttonElement };
    };

    const dropdown = (
      icon_name: string,
      label: string,
      options: { text: string; value: string; default?: boolean }[],
    ) => {
      const selectDiv = document.createElement('div');
      selectDiv.classList.add('control-select-container');

      const selectElement = document.createElement('select');
      selectElement.classList.add('control-select');

      for (const option of options) {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.innerText = option.text;
        selectElement.appendChild(optionElement);
        if (option.default) {
          optionElement.selected = true;
        }
      }

      const url = `https://fonts.gstatic.com/s/i/materialiconssharp/${icon_name}/v6/24px.svg`;
      const img = document.createElement('img');
      img.classList.add('icon');
      img.src = url;

      selectDiv.appendChild(img);
      selectDiv.appendChild(selectElement);

      selectDiv.classList.add('control-container');
      selectDiv.setAttribute('data-label', label);

      return { container: selectDiv, input: selectElement };
    };

    const speeds = [
      { text: '50%', value: '0.5' },
      { text: '75%', value: '0.75' },
      { text: '100%', value: '1.0', default: true },
      { text: '125%', value: '1.25' },
      { text: '150%', value: '1.5' },
    ];

    const volumes = [
      { text: '0%', value: '0.0' },
      { text: '10%', value: '0.1' },
      { text: '20%', value: '0.2' },
      { text: '30%', value: '0.3' },
      { text: '40%', value: '0.4' },
      { text: '50%', value: '0.5' },
      { text: '60%', value: '0.6' },
      { text: '70%', value: '0.7' },
      { text: '80%', value: '0.8' },
      { text: '90%', value: '0.9' },
      { text: '100%', value: '1.0', default: true },
    ];

    const controls = {
      speed: dropdown('speed', 'playback speed', speeds),
      back5: button('replay_5', 'rewind 5 seconds'),
      prev: button('skip_previous', 'previous chapter'),
      play: button('play_arrow', 'play'),
      pause: button('pause', 'pause'),
      next: button('skip_next', 'next chapter'),
      skip5: button('forward_5', 'fast-forward 5 seconds'),
      volume: dropdown('volume_up', 'volume', volumes),
    };

    fromEvent(controls.play.input, 'click').subscribe(() => this.media.play());
    fromEvent(controls.pause.input, 'click').subscribe(() =>
      this.media.pause(),
    );
    fromEvent(controls.next.input, 'click').subscribe(() =>
      this.playNextChapter(),
    );
    fromEvent(controls.prev.input, 'click').subscribe(() =>
      this.playPrevChapter(),
    );
    fromEvent(controls.back5.input, 'click').subscribe(() =>
      this.rewind5Seconds(),
    );
    fromEvent(controls.skip5.input, 'click').subscribe(() =>
      this.skip5Seconds(),
    );

    fromEvent(controls.volume.input, 'change').subscribe(() => {
      this.media.volume = +controls.volume.input.value;
    });

    fromEvent(controls.speed.input, 'change').subscribe(() => {
      this.media.playbackRate = +controls.speed.input.value;
    });

    for (const control of Object.values(controls)) {
      controlsDiv.appendChild(control.container);
    }

    this.container.appendChild(controlsDiv);
  }

  get currentChapterIndex() {
    const current = this.currentChapter;
    if (!current) return -1;
    const index = this.chapters.findIndex(chapter => current === chapter);
    return index;
  }

  get nextChapterIndex() {
    const index = this.currentChapterIndex + 1;
    return this.chapters[index] !== undefined ? index : -1;
  }

  get prevChapterIndex() {
    const index = this.currentChapterIndex - 1;
    return this.chapters[index] !== undefined ? index : -1;
  }

  get hasNextChapter() {
    return this.nextChapterIndex !== -1;
  }
  get hasPrevChapter() {
    return this.prevChapterIndex !== -1;
  }

  get nextChapter() {
    return this.hasNextChapter
      ? this.chapters[this.nextChapterIndex]
      : undefined;
  }

  get prevChapter() {
    return this.hasPrevChapter
      ? this.chapters[this.prevChapterIndex]
      : undefined;
  }

  private playNextChapter() {
    const chapter = this.nextChapter;
    this.media.currentTime = chapter
      ? chapter.timeInSeconds
      : this.media.duration;
  }

  private playPrevChapter() {
    const chapter = this.prevChapter;
    this.media.currentTime = chapter ? chapter.timeInSeconds : 0;
  }

  private skip5Seconds() {
    this.media.currentTime = Math.min(
      this.media.duration,
      Math.ceil(this.media.currentTime + 5),
    );
  }

  private rewind5Seconds() {
    this.media.currentTime = Math.max(
      0,
      Math.floor(this.media.currentTime - 5),
    );
  }

  private setTotalTime() {
    if (Number.isNaN(this.media.duration)) return;
    this.totalDuration = this.media.duration;
    if (this.firstDraw) {
      this.drawTimeline();
      this.firstDraw = false;
    }
  }

  public getCurrentVideoTime() {
    return this.media.currentTime;
  }

  public getVideoDuration() {
    if (Number.isNaN(this.media.duration)) return Number.POSITIVE_INFINITY;
    return this.media.duration;
  }

  private updateCurrentChapter() {
    const validChapters = this.chapters.filter(
      chapter => chapter.timeInSeconds <= this.getCurrentVideoTime(),
    );
    const last = validChapters[validChapters.length - 1];
    if (!last) return;
    if (last !== this.currentChapter) {
      this.currentChapter = last;
      this.currentChapterSubject.next(this.currentChapter);
    }
  }

  public addChapter(chapter: CreateChapter) {
    this.chapters.push(new Chapter(chapter));
    this.chaptersSubject.next(this.chapters);
  }

  public addChapters(chapters: Array<CreateChapter>) {
    for (const chapter of chapters) this.addChapter(chapter);
  }

  public removeChapter(chapterNo: number) {
    const chapterIndex = this.chapters.findIndex(
      chapter => chapter.no === chapterNo,
    );
    if (chapterIndex === -1) return undefined;
    return this.chapters.splice(chapterIndex, 1)[0];
  }

  public getCurrentFrameAsChapter() {
    return new Chapter({
      title: 'Current Frame as Chapter',
      timeInSeconds: this.getCurrentVideoTime(),
    });
  }
}
