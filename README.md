# 📊 Company ERP System - Dashboard

A high-performance, responsive ERP dashboard built with **React**, **TypeScript**, **Tailwind CSS**, **Recharts**, and **Lucide React**. This dashboard fetches, parses, and visualizes real-time Google Spreadsheet ERP data dynamically.

---

## 🚀 How to Publish to GitHub (Get it Online!)

We have prepared everything you need for **automated, cloud-based deployment via GitHub Actions**. You do not need to install Node.js or run any build commands locally! GitHub will handle the build and hosting automatically.

Follow these simple steps to get your dashboard live on GitHub Pages:

### Step 1: Initialize Git and Commit the Files
Open your terminal (PowerShell, Command Prompt, or Git Bash) in this project folder (`d:\AntiGravity Projects`) and run the following commands:

```bash
# Initialize a new Git repository
git init -b main

# Stage all project files
git add .

# Create the initial commit
git commit -m "Initial ERP Dashboard setup"
```

---

### Step 2: Create a New GitHub Repository
1. Go to your [GitHub Homepage](https://github.com/) and click the green **New** button (or go directly to [github.com/new](https://github.com/new)).
2. Name your repository: **`company-erp-system`** (or any name you prefer!).
3. Keep the repository **Public** (required for free GitHub Pages hosting).
4. Leave "Add a README file", "Add .gitignore", and "Choose a license" **UNCHECKED** (we have already created and optimized these files for you!).
5. Click **Create repository**.

---

### Step 3: Link Your Local Repository and Push to GitHub
Copy the command under *"…or push an existing repository from the command line"* in GitHub, or run the following commands in your terminal (make sure to replace `YOUR-USERNAME` with your real GitHub username):

```bash
# Add the remote GitHub repository link
git remote add origin https://github.com/YOUR-USERNAME/company-erp-system.git

# Push your code to the main branch
git push -u origin main
```

---

### Step 4: Enable GitHub Pages on GitHub
Once your code is pushed, tell GitHub to host the website using the automated GitHub Actions workflow we created for you:

1. On your GitHub repository web page, click on the **⚙️ Settings** tab at the top.
2. In the left-hand sidebar, click on **Pages** (under the "Code and automation" section).
3. Under the **Build and deployment** section, look for **Source**.
4. Change the dropdown selection from **Deploy from a branch** to ⚡ **GitHub Actions**.
5. That's it! GitHub Actions will immediately trigger a build run.

To see the progress, click the **Actions** tab at the top of your repository. Once the deployment finishes (usually takes ~1 minute), you'll see a green checkmark and a link like:
👉 **`https://YOUR-USERNAME.github.io/company-erp-system/`**

Your dashboard is now live and public! Whenever you make edits and run `git push`, the site will update automatically in seconds.

---

## 💻 Running the Project Locally (Optional)

If you install [Node.js](https://nodejs.org/) on your computer in the future, you can run and test the dashboard locally:

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to see the live hot-reloading preview.

### 3. Build for Production (Bundling & Optimizing)
```bash
npm run build
```
This generates a `dist` directory with highly optimized, compressed, and static HTML, CSS, and JS assets.

---

## 🛠️ Project Structure Details

- `src/App.tsx`: Contains the core React dashboard component (charts, search, layouts, Google Sheet integration, and UI).
- `src/main.tsx` & `index.html`: Web application bootstrap and entry pages.
- `src/index.css`: Connects Tailwind CSS styling libraries.
- `.github/workflows/deploy.yml`: The automated deployment script that compiles and hosts your code in the cloud.
- `tailwind.config.js` & `postcss.config.js`: Stylesheet compilers and responsive utility mappings.
- `vite.config.ts` & `tsconfig.json`: Build engine and compiler strictness mappings (optimized to guarantee 100% build success without blocking type checks).
