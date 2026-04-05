# 🚀 Webex Assistant

Webex Assistant è un'estensione per Google Chrome (e browser basati su Chromium) progettata per migliorare l'esperienza di riproduzione dei video e delle lezioni su Webex. Ti permette di:
- **Saltare automaticamente i silenzi** per risparmiare tempo durante la visione delle registrazioni.
- **Controllare granularmente la velocità di riproduzione**, andando oltre i limiti standard del player originale.
- **Inserire automaticamente la tua email istituzionale/studente** durante il login su Webex.

---

## 🛠️ Come installare l'estensione su Google Chrome 

Essendo attualmente disponibile sotto forma di sorgente diretta, puoi installare Webex Assistant caricandolo manualmente in "Modalità Sviluppatore".
Segui attentamente questi passaggi:

### Passo 1: Scarica l'estensione
1. Vai nella pagina principale di questa repository GitHub.
2. Clicca sul pulsante verde **Code** in alto a destra e seleziona **Download ZIP**.
3. Assicurati che lo scaricamento sia stato completato sul tuo computer.

### Passo 2: Estrai e posiziona la cartella in un luogo definitivo
1. Dalla tua cartella *Download*, fai clic col tasto destro sul file `.zip` che hai scaricato e premi **Estrai tutto...**
2. **⚠️ IMPORTANTE:** Copia o sposta la cartella estratta in una posizione sicura sul tuo computer, ovvero una cartella che non sposterai in futuro (ad esempio nella cartella `Documenti` o creandone una apposita chiamata `Estensioni_Chrome`).
   > *Perché? Chrome caricherà l'estensione direttamente leggendo i file da quel preciso percorso. Se in futuro eliminerai, sposterai o rinominerai la cartella, l'estensione smetterà di funzionare restituendo un errore!*

### Passo 3: Abilita la Modalità Sviluppatore su Chrome
1. Apri Google Chrome.
2. Clicca sulla barra degli indirizzi in alto, copia e incolla il seguente link e premi Invio:
   🔗 **[`chrome://extensions/`](chrome://extensions/)**
3. Nella pagina che si aprirà, cerca l'interruttore in alto a destra denominato **Modalità sviluppatore** (o *Developer mode* in inglese) e **attivalo**.

### Passo 4: Carica l'estensione nel browser
1. Dopo aver attivato la Modalità sviluppatore, in alto a sinistra compariranno tre nuovi pulsanti.
2. Clicca sul pulsante **Carica estensione non pacchettizzata** (oppure *Load unpacked*).
3. Si aprirà una finestra per sfogliare i tuoi file: naviga fino alla cartella che avevi posizionato in un luogo definitivo nel *Passo 2*.
4. **Attenzione:** non selezionare il file `.zip`, ma apri la cartella estratta fino ad arrivare alla sottocartella che contiene al suo interno un file chiamato `manifest.json`.
5. Fai clic su **Seleziona cartella**.

### Passo 5: Fatto! 🎉
L'estensione apparirà ora nella tua lista e sarà subito funzionante sui domini `*.webex.com`.
💡 **Un consiglio in più:** Per averla sempre a portata di mano, clicca sull'icona a forma di "pezzo di puzzle" 🧩 in alto a destra su Chrome e clicca sull'icona a forma di punta da disegno (Pin) 📌 accanto a **Webex Assistant** per fissarla definitivamente alla barra principale!

---

## 🐛 Segnalazione Bug o Idee
Se riscontri qualche problema durante l'uso o hai dei suggerimenti, sentiti libero di aprire una **[Issue](https://github.com/lorenzovitale1/webex_assistant/issues)** in questa repository.
