
# Rayin Translation Website

This is the Vue.js + Vite website for Rayin Translation.
It connects to a Supabase project for novel data.

## Setup

1.  Open a terminal in this directory:
    ```bash
    cd d:\Story\Translate\web
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Populate the Database with Chapters:
    ```bash
    npm run seed
    ```
    *Note: This script reads the markdown files from `../また会えたら結婚しよう、と約束した元カノに一週間でバッタリ再会しちゃった件` and uploads them to Supabase.*

4.  Start the Development Server:
    ```bash
    npm run dev
    ```

5.  Open your browser at the URL shown (usually `http://localhost:5173`).

## Project Structure

- `src/views`: Contains the pages (Home, Novel Detail, Chapter Reader).
- `src/components`: UI components.
- `seed.js`: Script to parse local markdown and upload to Supabase.

## Supabase

Project URL: `https://ykceernevnnsbncuhygl.supabase.co`
Data is stored in `novels` and `chapters` tables.
