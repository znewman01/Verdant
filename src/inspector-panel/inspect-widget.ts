import { Widget } from "@phosphor/widgets";

import { HistoryModel } from "../model/history";

import { GhostBook } from "../ghost-book/ghost-book";

import { FilterFunction } from "../panel/search-bar";

import { Run } from "../model/run";

import { Annotator } from "../run-panel/annotator";

import { Inspect } from "../inspect";

import { VerdantPanel } from "../panel/verdant-panel";

import { Nodey, NodeyMarkdown, NodeyCode, NodeyOutput } from "../model/nodey";

import { Wishbone } from "./wishbone";

const INSPECT = "v-VerdantPanel-inspect";
const INSPECT_ICON = "v-VerdantPanel-inspect-icon";
const INSPECT_HEADER = "v-VerdantPanel-inspect-header";
const INSPECT_TITLE = "v-VerdantPanel-inspect-title";
//const INSPECT_DIFF_OPTIONS = "v-Verdant-inspect-diff-options";
const INSPECT_DIFF_OPT = "v-Verdant-inspect-diff-opt";
const INSPECT_CONTENT = "v-VerdantPanel-inspect-content";
const INSPECT_VERSION = "v-VerdantPanel-inspect-version";
const INSPECT_VERSION_LABEL = "v-VerdantPanel-inspect-version-label";
const INSPECT_ANNOTATION_BOX = "v-VerdantPanel-inspect-version-annotations";
const INSPECT_VERSION_ACTION = "v-VerdantPanel-search-filter";
const RUN_LINK = "v-VerdantPanel-inspect-run-link";
const INSPECT_VERSION_CONTENT = "v-VerdantPanel-inspect-version-content";
const INSPECT_CLIPBOARD = "v-VerdantPanel-inspect-clipboard";
const NOTE_INPUT = "v-VerdantPanel-inspect-notes";
const NOTE_INPUT_LABEL = "v-VerdantPanel-inspect-notes-label";
const SEARCH_FILTER_RESULTS = "v-VerdantPanel-search-results-label";

/**
 * A widget which displays cell-level history information
 */
export class InspectWidget extends Widget {
  private _historyModel: HistoryModel;
  private _active: boolean = false;
  private _header: HTMLElement;
  private _clipboard: HTMLTextAreaElement;
  readonly parentPanel: VerdantPanel;
  private activeFilters: FilterFunction<Nodey>;
  private textQuery: string;

  constructor(historyModel: HistoryModel, parentPanel: VerdantPanel) {
    super();
    this._historyModel = historyModel;
    this.parentPanel = parentPanel;
    this.addClass(INSPECT);

    this._header = document.createElement("div");
    this._header.classList.add(INSPECT_HEADER);

    let icon = document.createElement("div");
    icon.classList.add(INSPECT_ICON);
    icon.addEventListener("click", this.toggleWishbone.bind(this));

    let title = document.createElement("div");
    title.classList.add(INSPECT_TITLE);
    title.textContent = "Select a notebook element to inspect its history";

    /*let diffOptions = document.createElement("div");
    diffOptions.classList.add(INSPECT_DIFF_OPTIONS);
    let op1 = document.createElement("div");
    op1.textContent = "Compare to current version";
    op1.classList.add(INSPECT_DIFF_OPT);
    op1.classList.add("left");
    op1.addEventListener("click", this.switchDiffType.bind(this, 1));
    diffOptions.appendChild(op1);
    let op2 = document.createElement("div");
    op2.textContent = "Show original edits";
    op2.classList.add(INSPECT_DIFF_OPT);
    op2.classList.add("active");
    op2.addEventListener("click", this.switchDiffType.bind(this, 2));
    diffOptions.appendChild(op2);*/

    this._header.appendChild(icon);
    this._header.appendChild(title);
    //this._header.appendChild(diffOptions);

    let content = document.createElement("ul");
    content.classList.add(INSPECT_CONTENT);

    this.node.appendChild(content);

    this._clipboard = document.createElement("textarea");
    this._clipboard.classList.add(INSPECT_CLIPBOARD);
    this.node.appendChild(this._clipboard);

    // look for jp-OutputArea-output
  }

  hide() {
    super.hide();
    this._active = false;
  }

  show() {
    super.show();
    this._active = true;
    this.retrieveTarget();
  }

  onGhostBookOpened(book: GhostBook) {
    book.connectInspectPanel(this);
  }

  onGhostBookClosed() {}

  private copyToClipboard(nodeName: string) {
    let nodey = this._historyModel.getNodey(nodeName);
    let str = this.inspector.renderNode(nodey).text;
    let el = document.createElement("textarea");
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }

  private animateLoading(button: HTMLElement) {
    button.classList.add("load");
    button.classList.add("active");
    setTimeout(() => {
      button.classList.remove("load");
    }, 500);
    setTimeout(() => {
      button.classList.remove("active");
    }, 600);
  }

  private commentVersion(
    nodeyName: string,
    button: HTMLElement,
    labelArea: HTMLElement
  ) {
    if (button.classList.contains("active")) {
      button.classList.remove("active");
      labelArea.removeChild(labelArea.getElementsByClassName(NOTE_INPUT)[0]);
    } else {
      button.classList.add("active");
      let nodey = this._historyModel.getNodey(nodeyName);
      let noteArea = document.createElement("div");
      noteArea.classList.add(NOTE_INPUT);
      let noteLabel = document.createElement("div");
      noteLabel.classList.add(NOTE_INPUT_LABEL);
      noteLabel.textContent = "Note:";
      noteArea.appendChild(noteLabel);
      let textarea = Annotator.buildTextArea(nodey, this._historyModel);
      noteArea.appendChild(textarea);
      labelArea.appendChild(noteArea);
    }
  }

  public get inspector() {
    return this._historyModel.inspector;
  }

  public get historyModel() {
    return this._historyModel;
  }

  get header() {
    return this._header;
  }

  get diffOps() {
    return this.header.getElementsByClassName(INSPECT_DIFF_OPT);
  }

  get headerTitle() {
    return this.header.getElementsByClassName(INSPECT_TITLE)[0];
  }

  get icon() {
    return this._header.getElementsByClassName(INSPECT_ICON)[0];
  }

  get content() {
    return this.node.getElementsByClassName(INSPECT_CONTENT)[0];
  }

  public retrieveTarget() {
    this.changeTarget(this.inspector.target);
  }

  public changeTarget(target: Nodey[]) {
    if (this._active) {
      console.log("Target is", target)
      this.headerTitle.textContent =
        "Inspecting " + target[0].typeName + " node " + target[0].name;
      this.content.innerHTML = "";
      this.fillContent(target, this.inspector.versionsOfTarget);
    }
  }

  public switchDiffType(diffType: number) {
    console.log("switch diff to ", diffType);
    let ops = this.diffOps;
    for (let i = 0; i < ops.length; i++) ops[i].classList.remove("active");
    ops[diffType - 1].classList.add("active");
  }

  private switchPane(runWithVersion: Nodey, runs: number[]) {
    this.parentPanel.switchToNotebookHistory();
    this.parentPanel.searchBar.runContainsNode(runWithVersion);
    console.log("FOCUS ON RUNS", runs);
  }

  filterNodeyList(filter: FilterFunction<Nodey>) {
    this.activeFilters = filter;
    this.content.innerHTML = "";
    this.fillContent(this.inspector.target, this.inspector.versionsOfTarget);
  }

  filterByText(text: string) {
    this.textQuery = text;
    this.content.innerHTML = "";
    this.fillContent(this.inspector.target, this.inspector.versionsOfTarget);
  }

  clearFilters() {
    console.log("CLEAR FILTERS");
    if (this.activeFilters || this.textQuery) {
      this.activeFilters = null;
      this.textQuery = null;
      this.content.innerHTML = "";
      this.fillContent(this.inspector.target, this.inspector.versionsOfTarget);
    }
  }

  private async fillContent(
    target: Nodey[],
    verList: { version: string; runs: any; text: string }[]
  ) {
    var contentDiv = this.content;
    let matches = 0;
    verList.map(async item => {
      let text = item.text;
      let li = document.createElement("div");
      li.classList.add(INSPECT_VERSION);

      let nodeyVer;
      if (target[0] instanceof NodeyOutput)
        nodeyVer = this._historyModel.getOutput(item.version);
      else nodeyVer = this._historyModel.getNodey(item.version);

      if (!this.activeFilters || this.activeFilters.filter(nodeyVer)) {
        console.log("This node was used in runs", nodeyVer, target);
        if (!this.textQuery || text.indexOf(this.textQuery) > -1) {
          matches += 1;

          let label = this.buildVerHeader(nodeyVer);
          li.appendChild(label);

          let content = document.createElement("div");
          content.classList.add(INSPECT_VERSION_CONTENT);
          li.appendChild(content);

          if (nodeyVer instanceof NodeyMarkdown) {
            content.classList.add("markdown");
            await this.inspector.renderMarkdownVersionDiv(
              nodeyVer,
              text,
              content,
              Inspect.CHANGE_DIFF,
              this.textQuery
            );
          } else if (nodeyVer instanceof NodeyCode) {
            content.classList.add("code");
            await this.inspector.renderCodeVerisonDiv(
              nodeyVer,
              text,
              content,
              Inspect.CHANGE_DIFF,
              this.textQuery
            );
          } else if (nodeyVer instanceof NodeyOutput) {
            await this.inspector.renderOutputVerisonDiv(
              nodeyVer,
              content,
              this.textQuery
            );
          }

          contentDiv.insertBefore(li, contentDiv.firstElementChild);

          if (content.scrollHeight > content.clientHeight) {
            content.classList.add("overflow");
          }
        }
      }
    });
    let last = contentDiv.lastElementChild;
    if (last) last.classList.add("last");

    if (this.activeFilters || this.textQuery) {
      let text = "";
      if (this.activeFilters) text = this.activeFilters.label;
      if (this.activeFilters && this.textQuery) text += " and ";
      if (this.textQuery) text += 'the text "' + this.textQuery + '"';
      let label = document.createElement("div");
      label.classList.add(SEARCH_FILTER_RESULTS);
      label.textContent = matches + " versions found with " + text;
      contentDiv.insertBefore(label, contentDiv.firstElementChild);
    }
  }

  public buildVerHeader(nodeyVer: Nodey) {
    let created = nodeyVer.run[0];
    let timestamp = null;
    if (created !== null && created !== undefined) {
      console.log(
        "run is ",
        this._historyModel.runModel.getRun(created),
        created
      );
      timestamp = new Date(
        this._historyModel.runModel.getRun(created).timestamp
      );
    }

    //v2: created 5/4 8:15pm, used in 555 runs
    let label = document.createElement("div");
    label.classList.add(INSPECT_VERSION_LABEL);
    let l = document.createElement("span");
    if (timestamp) {
      l.textContent =
        "v" +
        (nodeyVer.version + 1) +
        ": created " +
        Run.formatTime(timestamp) +
        ", used in ";
      let r = document.createElement("span");
      r.classList.add(RUN_LINK);
      r.addEventListener(
        "click",
        this.switchPane.bind(this, nodeyVer, nodeyVer.run)
      );
      r.textContent = "these runs";
      label.appendChild(l);
      label.appendChild(r);
    } else {
      l.textContent = "v" + (nodeyVer.version + 1) + ": has never been run";
      label.appendChild(l);
    }

    let annotator = document.createElement("div");
    annotator.classList.add(INSPECT_ANNOTATION_BOX);
    let star = document.createElement("div");
    star.classList.add(INSPECT_VERSION_ACTION);
    star.classList.add("star");
    if (nodeyVer.star > -1) star.classList.add("active");
    star.addEventListener(
      "click",
      Annotator.star.bind(this, star, nodeyVer, this._historyModel)
    );
    let note = document.createElement("div");
    note.classList.add(INSPECT_VERSION_ACTION);
    note.classList.add("comment");
    note.addEventListener(
      "click",
      this.commentVersion.bind(this, nodeyVer.name, note, label)
    );
    let clippy = document.createElement("div");
    clippy.classList.add(INSPECT_VERSION_ACTION);
    clippy.classList.add("clippy");
    clippy.addEventListener(
      "click",
      this.copyToClipboard.bind(this, nodeyVer.name)
    );
    clippy.addEventListener("mouseup", this.animateLoading.bind(this, clippy));
    annotator.appendChild(star);
    annotator.appendChild(note);
    annotator.appendChild(clippy);
    label.appendChild(annotator);

    if (nodeyVer.note > -1) this.commentVersion(nodeyVer.name, note, label);
    return label;
  }

  public toggleWishbone() {
    if (this.icon.classList.contains("active")) {
      this.icon.classList.remove("active");
      this.header.classList.remove("active");
      Wishbone.endWishbone(this._historyModel.notebook, this._historyModel);
    } else {
      this.icon.classList.add("active");
      this.header.classList.add("active");
      Wishbone.startWishbone(this._historyModel);
    }
  }
}
