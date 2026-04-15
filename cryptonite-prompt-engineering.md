# Cryptonite — Prompt Engineering Documentation

## What This Is

This documents the process of building a full React + TypeScript SPA using an AI coding agent, treated as a prompt engineering exercise.

The project is a cryptocurrency dashboard — a course assignment requiring API integration, real-time data visualization, and LLM-powered recommendations. The teacher encouraged us to experiment with giving project tasks to LLMs and evaluating the output. I took it a step further: instead of just testing what the agent spits out, I built a detailed, structured set of instructions to guide the agent through the entire project — architecture, coding patterns, folder structure, and all.

This document contains the project brief I gave the agent, followed by the iterative prompts I used to refine the result, with my reasoning between each one.

*Note: AI recommendations in this app are for demonstration purposes only, not financial advice.*

---

## The First Prompt — Full Project Brief

I had the project requirements as a PDF, but I knew handing just the PDF to the agent wouldn't be enough. A PDF describes what the app *should do* — it doesn't tell an agent *how to implement it*. Without specific guidance, the agent would make its own architectural decisions, and I'd lose the ability to jump in and understand or tweak the code.

So before writing a single line, I planned everything: which data belongs in Redux vs local state (chart polling data doesn't need to be global, selected coins do), how services should be structured, what the folder hierarchy looks like, which coding patterns to follow (destructuring at top, typed PayloadAction, try/catch/finally), and the exact build order from project setup through deployment.

The goal was a single self-contained document — one file the agent could follow top to bottom without needing anything else.

---

### Prompt 1: Project Instructions

#### Overview
A cryptocurrency dashboard SPA built with React + TypeScript. Displays info on 100 popular coins, real-time price reports, and AI-powered buy/sell recommendations.

#### Tech Stack
- React + TypeScript
- Vite
- Redux Toolkit + react-redux
- react-router-dom
- axios
- recharts (for real-time chart)
- Plain CSS (one `.css` file per component)

#### Pages & Features

**Home Page**
- Fetches and displays 100 cryptocurrency coins as cards from the CoinGecko API.
- Each CoinCard shows: coin icon, symbol (e.g. BTC), name (e.g. Bitcoin), a "More Info" button, and a toggle Switch.
- Search: a search input in the Navbar filters coins on every keystroke. Case-insensitive, matches against coin name OR symbol. Filter the existing array client-side — no API call on search.
  ```
  filter(coin => coin.symbol.toLowerCase().includes(input) || coin.name.toLowerCase().includes(input))
  ```
- More Info: clicking opens a modal/overlay showing the coin's current price in USD ($), EUR (€), and ILS (₪). If using overlays instead of modals, opening one must close any previously open one.
- Switch: a styled checkbox toggle. Marks a coin as "selected" for the Reports and AI pages. Max 5 selected coins. Selections persist across browser sessions via localStorage.
- 5-Coin Limit Dialog: if the user tries to select a 6th coin, show a modal dialog where they can remove one of the existing 5 to make room. The dialog cannot be dismissed without making a choice. Save this feature for last during implementation.

**Reports Page**
- Displays a single real-time chart containing all selected coins.
- Polls the CryptoCompare API every 1 second — one single request per poll returning all selected coins, not one request per coin.
- Displays prices in USD only.
- Uses recharts for the chart.
- Chart data is local component state — not Redux.

**AI Recommendations Page**
- Shows only the coins the user selected via Switch.
- For each coin, the user can request an AI recommendation (buy / don't buy + explanation paragraph).
- Fetches detailed market data from CoinGecko, then sends a prompt to an LLM API with this data: name, current_price_usd, market_cap_usd, volume_24h_usd, price_change_percentage_30d_in_currency, price_change_percentage_60d_in_currency, price_change_percentage_200d_in_currency.
- Use `Promise.all` when fetching recommendations for multiple coins.
- AI recommendation data is local component state — not Redux.
- API key handling: never hardcode the key. Collect it from the user via a prompt or input field and store in localStorage.

**About Page**
- Static page with: project description, developer info, developer photo.

#### API Endpoints

1. Coins list (Home page): `GET https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd`
2. Single coin detail (More Info): `GET https://api.coingecko.com/api/v3/coins/<coin-id>`
3. Real-time prices (Reports chart): `GET https://min-api.cryptocompare.com/data/pricemulti?tsyms=usd&fsyms=<symbols>`
4. Coin market data (AI page): `GET https://api.coingecko.com/api/v3/coins/<coin-id>?market_data=true`
5. LLM API (AI recommendation): NVIDIA free models — `https://build.nvidia.com/models`

#### Architecture

**Redux (Global State) — two slices only:**
1. coinsSlice — holds the full list of 100 coins fetched from the markets API. Fetched once on app load.
2. selectedCoinsSlice — holds an array of selected coin IDs (max 5). Synced with localStorage on every change. Loaded from localStorage on app init.

**Local Component State — everything else:**
- Search input text
- More Info modal open/close + coin data
- Reports page chart/polling data
- AI recommendation results
- Loading states

**Services:** classes with methods for each API operation. Not auth-aware (no JWT needed). Use axios for all API calls.

#### Folder Structure

```
src/
  assets/
  components/
    app/
    layout/
      navbar/
      header/
      layout/
      footer/
    home/
      coinCard/
      coinGrid/
      moreInfoModal/
      limitDialog/
    reports/
      realtimeChart/
    ai/
      recommendationCard/
    about/
    common/
      spinner/
      spinnerButton/
      switch/
      modal/
  hooks/
  services/
  models/
  redux/
  util/
  index.css
  main.tsx
```

#### Coding Patterns & Guidelines

**Slices:** typed interface for state, `PayloadAction<T>` for every reducer, named exports for actions, default export for reducer.

**Components:** props defined as an interface above the component, all destructuring at the top, all hooks at the top level, async operations with try/catch/finally and local loading state, dispatch after successful service call, conditional rendering via `{condition && <JSX />}`, each component has its own `.css` file with className matching the component name.

**Services:** classes with methods for each API operation, instantiated via a custom hook or directly in components.

**General:** TypeScript models in `models/` for all data shapes, utility functions in `util/`, no hardcoded API keys.

#### Styling
- Dark mode and light mode toggle.
- Plain CSS, one file per component.
- Creative design — avoid generic aesthetics.

#### What NOT To Do
- Do NOT implement parallax.
- Do NOT hardcode any API keys.
- Do NOT make API calls on every search keystroke — filter the existing array.
- Do NOT make separate API calls per coin for the Reports chart — use one request with all symbols.
- Do NOT put chart polling data or AI recommendations in Redux.
- Do NOT allow a 6th coin to be selected under any circumstance.

#### Build Order (Bottom-Up)
1. Project setup — fork repo, Vite scaffold, install deps, folder structure
2. Redux store — configure store, coinsSlice, selectedCoinsSlice (with localStorage sync)
3. Services — all 5 API services
4. Models — TypeScript interfaces for all data shapes
5. Shared components — Navbar, CoinCard, Switch, Modal, SpinnerButton
6. Pages — Home → Reports → AI → About
7. Dark/light mode toggle
8. 5-coin limit dialog (save for last)
9. Styling polish

---

## The CORS Problem — Why I Switched to OpenAI

The agent built the app with NVIDIA's API as recommended in class. Everything compiled and ran, but when I tried making an actual API call from the browser, I hit a CORS error.

CORS (Cross-Origin Resource Sharing) is a browser security mechanism. Some APIs block requests that come directly from browsers to prevent abuse — like someone running a script that floods the API with calls. The request never even reaches the server; the browser itself blocks it.

I tried a few things before landing on OpenAI. First, I tested several other LLM models on NVIDIA's platform, thinking maybe only some of them had the restriction. They all did. I considered using Claude's API instead, but it has the same browser-side restriction.

I landed on OpenAI because I'd already used their API successfully from the browser in a previous project (a backgammon game with an AI opponent). I knew their Chat Completions endpoint accepts browser requests, so I wrote a targeted refactor prompt.

---

### Prompt 2: Refactor to OpenAI

Refactor the AiService to use OpenAI's Chat Completions API instead of NVIDIA. Here are the exact details:

Endpoint: `POST https://api.openai.com/v1/chat/completions`

Request headers:
```
Content-Type: application/json
Authorization: Bearer <key from localStorage>
```

Request body:
```json
{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "<your prompt with coin data>" }]
}
```

The coin data sent in the prompt should include: name, current_price_usd, market_cap_usd, volume_24h_usd, price_change_percentage_30d_in_currency, price_change_percentage_60d_in_currency, price_change_percentage_200d_in_currency.

Response shape:
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "the recommendation text"
      }
    }
  ]
}
```

Extract the recommendation text from `response.choices[0].message.content`.

Keep the same API key flow (prompt user, store in localStorage). Keep the same prompt content asking for buy/don't buy + explanation. Don't touch anything outside the AI service and its consumers.

---

## Refining the AI Integration — System Prompt and Structured Responses

After the OpenAI switch worked, I noticed the API call was only sending a single user message with the coin data and basic instructions. OpenAI's Chat Completions API supports a `system` role — a separate message that tells the model how to behave, what format to respond in, and what role to play. This is separate from the `user` message, which carries the actual data.

By adding a system prompt, the model's responses become more predictable and consistently structured. I also defined a strict JSON response format with three fields — `verdict`, `explanation`, and `flavor` — so the UI can parse and display each piece independently (verdict as a color-coded badge, explanation as analysis text, flavor as context about the coin).

I also wanted to make sure all traces of the NVIDIA integration were cleaned up — old localStorage keys, footer references, about page copy.

---

### Prompt 3: System Message, Structured Response, and Cleanup

Three things to update:

1. **AiService response parsing** — the LLM now returns raw JSON (no markdown/code blocks) in this shape:
```json
{
  "verdict": "string",
  "explanation": "string",
  "flavor": "string"
}
```
Parse `response.choices[0].message.content` as JSON. Update the AiRecommendation model to match these three fields. Update the AI page UI to display: flavor text at the top, explanation below it, verdict as a visual badge (green for buy, red for sell).

2. **Cleanup** — remove all references to the old NVIDIA localStorage key (`cryptonite.nvidia_api_key`). Update About.tsx and Footer.tsx to reference OpenAI instead of NVIDIA NIM.

3. **System message** — add a system role message before the user message in the API call. The system message is already written in the codebase as a constant string — don't modify its content, just make sure it's sent as `{ role: "system", content: SYSTEM_PROMPT }` before the user message.

---

## Takeaways

Three prompts. The first was the most important — a detailed, opinionated project brief that gave the agent clear architectural decisions, coding patterns, and constraints. The second and third were surgical refinements: targeted scope, specific request/response formats, and explicit instructions on what to touch and what to leave alone.

The key lesson: vague prompts produce unpredictable code. Specific prompts — with exact API shapes, folder structures, and coding conventions — produce code you can actually read, understand, and maintain.
