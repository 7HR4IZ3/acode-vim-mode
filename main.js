(function () {
  let plugin = {
    id: "acode.vim"
  };
  let AppSettings = acode.require("settings");

  console.log(ace.require("ace/keyboard/vim"));
  
  document.head.appendChild(tag("style", {
    textContent: `
    .ace_dialog.ace_dialog-bottom {
      z-index: 99;
    }
    `
  }))

  class VimPlugin {
    #vim;
    #isSetup = false;
    #isAttached = false;

    get #commandsMap() {
      return [
        { bind: ["run", "r"], exec: "run" },
        { bind: ["exit", "e"], exec: "exit" },
        { bind: ["find", "f"], exec: "find" },
        { bind: ["findfile", "fi"], exec: "find-file" },
        { bind: ["prevfile", "pr"], exec: "prev-file" },
        { bind: ["nextfile", "ne"], exec: "next-file" },
        { bind: ["open", "o"], exec: "files" },
        { bind: ["write", "w"], exec: "save" },
        { bind: ["new", "n"], exec: "new-file" },
        { bind: ["format", "fo"], exec: "format" },
        { bind: ["menu", "m"], exec: "toggle-menu" },
        { bind: ["writeas", "wr"], exec: "save-as" },
        { bind: ["runfile", "ru"], exec: "run-file" },
        { bind: ["quit", "q"], exec: "close-current-tab" },
        { bind: ["quitall", "qu"], exec: "close-all-files" },
        { bind: ["palette", "pa"], exec: "command-palette" },
        { bind: ["sidebar", "si"], exec: "toggle-sidebar" },
        { bind: ["writequit", "wri"], exec: ["save", "quit"] },
        { bind: ["problems", "prob"], exec: "open", args: ["problems"] },
        { bind: ["settings", "sett"], exec: "open", args: ["settings"] }
      ];
    }

    async init() {
      if (this.settings.enabled) await this.attach();
    }

    async setup() {
      if (this.#isSetup) return;

      // this.#vim = ace.require("ace/keyboard/vim");
      this.#vim = await new Promise((resolve, reject) => {
        let vim = ace.require("ace/keyboard/vim");
        if (vim) return resolve(vim.Vim);

        let timeout,
          interval = setInterval(() => {
            let vim = ace.require("ace/keyboard/vim");
            if (vim) {
              clearInterval(timeout);
              clearInterval(interval);

              resolve(vim.Vim);
            }
          }, 100);

        // Just in case any error occurs.
        timeout = setTimeout(() => reject("Vim took too long to load"), 5000);
      });

      for (let command of this.#commandsMap) {
        let callback = command.cb;

        if (command.exec && !callback) {
          let exec = command.exec;
          let args = command.args || [];

          if (!Array.isArray(exec)) { exec = [exec] }

          callback = () => {
            exec.map(i => acode.exec(i, ...args));
            command.after && command.after();
          };
        }

        this.#vim.defineEx(...command.bind, callback);
      }
      this.#isSetup = true;
    }

    async attach() {
      if (this.#isAttached) return;

      // this.#vim.enterVimMode(editorManager.editor);
      editorManager.editor.setKeyboardHandler("ace/keyboard/vim");
      await this.setup();
      this.#isAttached = true;
    }

    detach() {
      if (!this.#isAttached) return;

      // this.#vim.leaveVimMode(editorManager.editor);
      editorManager.editor.setKeyboardHandler("");
      this.#isAttached = false;
    }

    destroy() {
      this.detach();
    }

    get defaultSettings() {
      return { enabled: true };
    }

    get settings() {
      let value = AppSettings.value[plugin.id];
      if (!value) {
        value = AppSettings.value[plugin.id] = this.defaultSettings;
        AppSettings.update();
      }
      return value;
    }

    get settingsObj() {
      return {
        list: [
          {
            index: 0,
            key: "enabled",
            text: "Enable Vim mode",
            info: "Enable Vim mode by default?",
            checkbox: !!this.settings.enabled
          }
        ],
        cb: (key, value) => {
          if (key === "enabled") {
            if (value) {
              this.attach();
            } else {
              this.detach();
            }
          }
          this.settings[key] = value;
          AppSettings.update();
        }
      };
    }
  }

  if (window.acode) {
    const vim = (window.vim = new VimPlugin());
    acode.setPluginInit(
      plugin.id,
      async (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
        if (!baseUrl.endsWith("/")) {
          baseUrl += "/";
        }
        vim.baseUrl = baseUrl;
        try {
          await vim.init($page, cacheFile, cacheFileUrl);
        } catch (err) {
          acode.alert("Acode Vim Error", String(err));
        }
      },
      vim.settingsObj
    );
    acode.setPluginUnmount(vim.id, () => {
      vim.destroy();
    });
  }
})();
