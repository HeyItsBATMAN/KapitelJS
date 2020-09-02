# Using KapitelJS

To create an instance of KapitelJS, import it and pass an HTMLMediaElement, e.g. a <video> and an element that will be used as a container for the timeline.

```js
import Kapitel from 'kapiteljs';

const container = document.getElementById('my-container');
const video = document.getElementById('my-video');

const kapitel = new Kapitel(video, container);
````

# Filling the timeline

Use the method addChapter to add chapters to your Kapitel instance

```js
kapitel.addChapter({
  title: 'Introduction',
  timeInSeconds: 0,
});

kapitel.addChapter({
  title: 'Chapter right after the one minute mark',
  timeInSeconds: 60,
});
```

You can also add multiple chapters using addChapters, which takes an array of chapter objects

```js
kapitel.addChapters([
  {
    title: 'Foo',
    timeInSeconds: 65,
  },
  {
    title: 'Bar',
    timeInSeconds: 70,
  },
]);
```

New chapters will be sorted by time, no need to worry about sorting your chapters before adding them

```js
kapitel.addChapter({
  title: 'I will appear way earlier, even though I was added later',
  timeInSeconds: 5,
});
```

# Configuring Kapitel

You can enable different features as well as change the styling when creating an instance of Kapitel

```js
const options = {
  // these will let you create chapters with ease
  createChapterButton: true,
  exportChaptersButton: true,
  // while these will limit the style of the container
  maxHeight: '200px',
  height: '10vh',
};

const kapitel = new Kapitel(video, container, options);
```
