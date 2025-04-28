# Stock Dashboard

A dynamic web application built with Next.js, React, TypeScript, and Tailwind CSS to display real-time stock quotes, allow users to add stocks to a watchlist, and sort the data. Data is fetched from the [Finnhub API](https://finnhub.io/).

## Features

- **Real-time Data:** Displays current stock prices, daily change, and percentage change.
- **Dynamic Watchlist:** Fetches an initial list of stocks and allows users to add new stock symbols via an input field.
- **Interactive Sorting:** Click table headers (Symbol, Price, Change, % Change) to sort the data in ascending or descending order.
- **Visual Feedback:** Newly added stocks are briefly highlighted for easy identification.
- **Loading & Error States:** Provides skeleton loaders during data fetching and clear error messages.
- **Responsive Design:** Built with Tailwind CSS for adaptability across different screen sizes.

## Technology Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **UI Library:** React
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **Data Source:** Finnhub API

## Prerequisites

- Node.js (v18 or later recommended)
- npm, yarn, or pnpm
- A **Finnhub API Key** (Free tier available) - Get one at [https://finnhub.io/register](https://finnhub.io/register)

## Setup and Configuration

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/7nguyennguyen3/stock-dashboard
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Configure API Key:**

    - You **MUST** obtain an API key from [Finnhub](https://finnhub.io/).
    - Create a file named `.env.local` in the root directory of the project.
    - Add your Finnhub API key to this file:

      ```plaintext
      # .env.local
      FINNHUB_API_KEY=YOUR_ACTUAL_FINNHUB_API_KEY
      ```

    - Replace `YOUR_ACTUAL_FINNHUB_API_KEY` with the key you obtained from Finnhub.
    - **Important:** The `.env.local` file is included in `.gitignore` by default in Next.js projects to prevent accidentally committing your secret keys.

## Running the Development Server

Once the setup is complete, you can run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
Open http://localhost:3000 with your browser to see the application.API Routes/api/stock: (GET) Fetches data for the initial list of stocks defined in the route handler./api/stock/new: (POST) Fetches data for a single stock symbol provided in the request body ({ "symbol": "XYZ" }).NotesThe free tier of the Finnhub API has rate limits. Be mindful of how frequently you refresh or add stocks.Stock data might
```
