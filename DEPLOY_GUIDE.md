# How to Deploy Musync to GitHub Pages 🚀

This guide will help you turn your code into a live website that you can share with anyone!

## Step 1: Open Repository Settings
1. Go to your GitHub repository page: [https://github.com/xenorbit/Musync](https://github.com/xenorbit/Musync)
2. Look at the top navigation bar (where Code, Issues, Pull Requests are).
3. Click on the **Settings** tab (usually the last icon on the right ⚙️).

## Step 2: Navigate to Pages
1. In the left sidebar of the Settings page, scroll down until you see the **"Code and automation"** section.
2. Click on **Pages**.

## Step 3: Configure Build and Deployment
1. Under the **"Source"** dropdown, ensure it is set to **"Deploy from a branch"**.
2. Under the **"Branch"** section:
   - Click the dropdown that says "None".
   - Select **`master`** (or `main` if that's your default).
   - Ensure the folder dropdown next to it stays as **`/(root)`**.
3. Click the **Save** button.

## Step 4: Wait for Deployment
1. Once you click Save, GitHub starts building your site.
2. Look at the very top of the Pages settings screen. You might see a yellow bar that says "GitHub Pages is currently being built..."
3. Wait about **30-60 seconds**.
4. Refresh the page.

## Step 5: Visit Your Live Site! 🌐
1. Once the build finishes, the bar at the top will turn **Green**.
2. It will say: **"Your site is live at..."** followed by a link (usually `https://xenorbit.github.io/Musync/`).
3. Click that link to see your live audio visualizer!

## Troubleshooting 🛠️
*   **404 Error?** If you see a "404 Not Found" error, wait another minute and refresh. Sometimes it takes a moment to propagate globally.
*   **Images/Styles Missing?** Ensure your `style.css` and `main.js` are in the main folder (root), which they are in this project.
*   **Audio Not Working?** Remember to click the "Initialize Experience" button on the splash screen to allow audio capture!

Enjoy your live visualizer! 🎵
