import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import open from "open";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

// ─── Welcome ──────────────────────────────────────────────────────────────────

function welcome() {
  console.clear();
  console.log(
    chalk.bold.cyan(
      "\n┌─────────────────────────────────────────┐\n" +
      "│  next-gdrive-index Setup Wizard         │\n" +
      "│  ─────────────────────────────────────  │\n" +
      "│  Let's get your Drive index ready!      │\n" +
      "└─────────────────────────────────────────┘\n"
    )
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pressEnter(message = "Press Enter to continue...") {
  await prompts({
    type: "text",
    name: "confirm",
    message: chalk.gray(message),
    initial: "",
  });
}

function generateEncryptionKey(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function base64Encode(str) {
  return Buffer.from(str).toString("base64");
}

// ─── Encryption (replicates EncryptionService from utils.server.ts) ───────────

async function encrypt(data, key) {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const alg = { name: "AES-GCM", iv };
    const keyhash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    const encodedData = new TextEncoder().encode(data);
    const secretKey = await crypto.subtle.importKey("raw", keyhash, alg, false, ["encrypt"]);
    const encryptedData = await crypto.subtle.encrypt(alg, secretKey, encodedData);
    return [Buffer.from(encryptedData).toString("hex"), Buffer.from(iv).toString("hex")].join(";");
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// ─── Update gIndex.config.ts ──────────────────────────────────────────────────

async function updateGIndexConfig(selectedFolder, encryptionKey) {
  console.log(chalk.bold("\n── Updating gIndex.config.ts ──\n"));

  const configPath = path.join(ROOT_DIR, "src", "config", "gIndex.config.ts");
  if (!fs.existsSync(configPath)) {
    throw new Error("gIndex.config.ts not found");
  }

  const spinner = ora("Encrypting folder ID...").start();
  const encryptedFolderId = await encrypt(selectedFolder.id, encryptionKey);
  spinner.text = "Updating configuration file...";

  let configContent = fs.readFileSync(configPath, "utf-8");

  // Replace rootFolder with encrypted value
  configContent = configContent.replace(
    /rootFolder:\s*["'][^"']*["']/,
    `rootFolder: "${encryptedFolderId}"`
  );

  // Handle Shared Drive settings
  const isSharedDrive = selectedFolder.isDrive === true;
  
  if (isSharedDrive) {
    spinner.text = "Encrypting shared drive ID...";
    const encryptedDriveId = await encrypt(selectedFolder.id, encryptionKey);
    configContent = configContent.replace(
      /isTeamDrive:\s*(true|false)/,
      "isTeamDrive: true"
    );
    configContent = configContent.replace(
      /sharedDrive:\s*["'][^"']*["']/,
      `sharedDrive: "${encryptedDriveId}"`
    );
  } else {
    configContent = configContent.replace(
      /isTeamDrive:\s*(true|false)/,
      "isTeamDrive: false"
    );
    configContent = configContent.replace(
      /sharedDrive:\s*["'][^"']*["']/,
      `sharedDrive: ""`
    );
  }

  fs.writeFileSync(configPath, configContent, "utf-8");
  spinner.succeed("gIndex.config.ts updated successfully");
}

// ─── Google Cloud Project ────────────────────────────────────────────────────

async function checkGCloudProject() {
  console.log(chalk.bold("\n── Google Cloud Project ──\n"));

  const { hasProject } = await prompts({
    type: "select",
    name: "hasProject",
    message: "Do you have a Google Cloud project?",
    choices: [
      { title: "Yes", value: true },
      { title: "No", value: false },
    ],
    initial: 0,
  });

  if (!hasProject) {
    console.log(chalk.yellow("\n→ Opening Google Cloud Console to create a project..."));
    await open("https://console.cloud.google.com/projectcreate");
    console.log(chalk.gray("  Follow the steps to create your project, then come back here.\n"));
    await pressEnter();
  }

  const { projectId } = await prompts({
    type: "text",
    name: "projectId",
    message: "Enter your Google Cloud Project ID:",
    validate: (value) =>
      value.trim().length > 0 ? true : "Project ID cannot be empty",
  });

  return projectId.trim();
}

// ─── Drive API ───────────────────────────────────────────────────────────────

async function checkDriveAPI(projectId) {
  console.log(chalk.bold("\n── Google Drive API ──\n"));

  const { hasAPI } = await prompts({
    type: "select",
    name: "hasAPI",
    message: "Do you have the Google Drive API enabled?",
    choices: [
      { title: "Yes", value: true },
      { title: "No", value: false },
    ],
    initial: 0,
  });

  if (!hasAPI) {
    const apiUrl = `https://console.cloud.google.com/apis/library/drive.googleapis.com?project=${projectId}`;
    console.log(chalk.yellow("\n→ Opening Google Cloud Console to enable Drive API..."));
    await open(apiUrl);
    console.log(chalk.gray("  1. Click the 'Enable' button\n  2. Wait for it to complete\n  3. Come back here\n"));
    await pressEnter();
  }
}

// ─── Service Account ──────────────────────────────────────────────────────────

async function checkServiceAccount() {
  console.log(chalk.bold("\n── Service Account ──\n"));

  const { hasSA } = await prompts({
    type: "select",
    name: "hasSA",
    message: "Do you have a Service Account?",
    choices: [
      { title: "Yes", value: true },
      { title: "No", value: false },
    ],
    initial: 0,
  });

  if (!hasSA) {
    console.log(chalk.yellow("\n→ Opening IAM & Admin Console..."));
    await open("https://console.cloud.google.com/iam-admin/serviceaccounts");
    console.log(chalk.gray("\n  Follow these steps:"));
    console.log(chalk.gray("  1. Click 'Create Service Account'"));
    console.log(chalk.gray("  2. Fill in the name and description"));
    console.log(chalk.gray("  3. Skip the permission grants"));
    console.log(chalk.gray("  4. Go to 'Keys' tab → 'Add Key' → 'Create new key'"));
    console.log(chalk.gray("  5. Choose JSON format and download the file"));
    console.log(chalk.gray("  6. Save it somewhere safe and come back here\n"));
    await pressEnter();
  }
}

// ─── Load Service Account JSON ───────────────────────────────────────────────

async function loadServiceAccount() {
  console.log(chalk.bold("\n── Service Account JSON ──\n"));

  let serviceAccount;
  let valid = false;

  while (!valid) {
    const { jsonPath } = await prompts({
      type: "text",
      name: "jsonPath",
      message: "Enter the path to your Service Account JSON file:",
      initial: path.join(ROOT_DIR, "service-account.json"),
    });

    const resolvedPath = path.resolve(jsonPath);
    if (!fs.existsSync(resolvedPath)) {
      console.log(chalk.red("  ✗ File not found. Please try again."));
      continue;
    }

    const spinner = ora("Reading and validating JSON...").start();
    await sleep(500);

    try {
      const content = fs.readFileSync(resolvedPath, "utf-8");
      serviceAccount = JSON.parse(content);

      // Validate structure
      if (serviceAccount.type !== "service_account") {
        spinner.fail("Invalid service account: type is not 'service_account'");
        continue;
      }
      if (!serviceAccount.client_email) {
        spinner.fail("Invalid service account: missing 'client_email'");
        continue;
      }
      if (!serviceAccount.private_key) {
        spinner.fail("Invalid service account: missing 'private_key'");
        continue;
      }

      spinner.succeed("Service Account JSON validated successfully");
      valid = true;
    } catch (err) {
      spinner.fail(`Failed to parse JSON: ${err.message}`);
    }
  }

  return serviceAccount;
}

// ─── Encode Service Account ──────────────────────────────────────────────────

function encodeServiceAccount(serviceAccount) {
  const spinner = ora("Encoding Service Account to base64...").start();
  const jsonString = JSON.stringify(serviceAccount, null, 2);
  const encoded = base64Encode(jsonString);
  spinner.succeed("Service Account encoded successfully");
  return encoded;
}

// ─── Share Folder Instructions ───────────────────────────────────────────────

async function shareFolderInstructions(clientEmail) {
  console.log(chalk.bold("\n── Share Drive Folder ──\n"));
  console.log(chalk.yellow(`→ Your Service Account email: ${chalk.bold(clientEmail)}`));
  console.log(chalk.gray("\n  You need to share your Drive folder with this email:"));
  console.log(chalk.gray("  1. Go to Google Drive"));
  console.log(chalk.gray("  2. Create a folder (or select an existing one)"));
  console.log(chalk.gray("  3. Right-click → Share"));
  console.log(chalk.gray(`  4. Enter: ${chalk.cyan(clientEmail)}`));
  console.log(chalk.gray("  5. Set permission to 'Editor' or 'Viewer'"));
  console.log(chalk.gray("  6. Click 'Send'\n"));

  const { shouldOpen } = await prompts({
    type: "select",
    name: "shouldOpen",
    message: "Open Google Drive now?",
    choices: [
      { title: "Yes", value: true },
      { title: "No", value: false },
    ],
    initial: 0,
  });

  if (shouldOpen) {
    await open("https://drive.google.com/drive/my-drive");
  }

  await pressEnter("Press Enter when you have shared the folder...");
}

// ─── List Drive Folders ──────────────────────────────────────────────────────

async function listDriveFolders(serviceAccount) {
  console.log(chalk.bold("\n── Select Root Folder ──\n"));
  console.log(chalk.gray("Loading accessible folders (this may take a moment)...\n"));

  const spinner = ora("Authenticating with Google Drive API...").start();
  await sleep(500);

  try {
    // Dynamic import to avoid issues if not installed
    const { google } = await import("googleapis");

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });

    spinner.text = "Fetching folders accessible to Service Account...";

    // Fetch folders from My Drive (folders shared with the Service Account)
    const myDriveFolders = [];

    async function listFoldersInParent(parentId, parentPath = "") {
      const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        spaces: "drive",
      });

      for (const folder of res.data.files || []) {
        const fullPath = parentPath ? `${parentPath}/${folder.name}` : `/${folder.name}`;
        myDriveFolders.push({
          id: folder.id,
          name: folder.name,
          path: fullPath,
          source: "My Drive",
        });
        // Recursively list subfolders (limit depth to avoid infinite loops)
        if (parentPath.split("/").length < 5) {
          await listFoldersInParent(folder.id, fullPath);
        }
      }
    }

    // List all folders accessible to the Service Account (not "root" which doesn't exist for SA)
    const accessibleFoldersRes = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id, name)",
      spaces: "drive",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: "allDrives",
    });

    // Process root-level folders and recurse
    for (const folder of accessibleFoldersRes.data.files || []) {
      const fullPath = `/${folder.name}`;
      myDriveFolders.push({
        id: folder.id,
        name: folder.name,
        path: fullPath,
        source: "My Drive",
      });
      // Recursively list subfolders
      await listFoldersInParent(folder.id, fullPath);
    }

    spinner.text = "Fetching Shared Drives...";

    // Fetch Shared Drives
    const sharedDrives = [];
    const sharedDriveRes = await drive.drives.list({
      fields: "drives(id, name)",
    });

    for (const driveItem of sharedDriveRes.data.drives || []) {
      sharedDrives.push({
        id: driveItem.id,
        name: driveItem.name,
        path: `/Shared Drives/${driveItem.name}`,
        source: "Shared Drive",
        isDrive: true,
      });

      // List folders inside each Shared Drive
      try {
        const foldersRes = await drive.files.list({
          q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
          driveId: driveItem.id,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          fields: "files(id, name)",
          corpora: "drive",
        });

        for (const folder of foldersRes.data.files || []) {
          sharedDrives.push({
            id: folder.id,
            name: folder.name,
            path: `/Shared Drives/${driveItem.name}/${folder.name}`,
            source: `Shared Drive: ${driveItem.name}`,
          });
        }
      } catch (err) {
        // Skip if can't list folders
      }
    }

    const allFolders = [...myDriveFolders, ...sharedDrives];

    if (allFolders.length === 0) {
      spinner.warn("No folders found");
      console.log(chalk.red("\n✗ Make sure you shared a folder with the Service Account."));
      await pressEnter();
      return null;
    }

    spinner.succeed("Folders loaded successfully");

    console.log(chalk.gray(`\nFound ${allFolders.length} folders:\n`));

    const { selectedFolder } = await prompts({
      type: "select",
      name: "selectedFolder",
      message: "Select the root folder for your index:",
      choices: allFolders.map((folder) => ({
        title: `${folder.name} ${chalk.gray(`(${folder.source})`)}`,
        description: folder.path,
        value: folder,
      })),
      initial: 0,
    });

    return selectedFolder;
  } catch (err) {
    spinner.fail(`Failed to list folders: ${err.message}`);
    console.log(chalk.gray("\nMake sure:"));
    console.log(chalk.gray("  - The Service Account JSON is valid"));
    console.log(chalk.gray("  - The Drive API is enabled"));
    console.log(chalk.gray("  - You shared a folder with the Service Account email\n"));
    await pressEnter();
    return null;
  }
}

// ─── Encryption Key ──────────────────────────────────────────────────────────

async function getEncryptionKey() {
  console.log(chalk.bold("\n── Encryption Key ──\n"));

  const { useRandom } = await prompts({
    type: "select",
    name: "useRandom",
    message: "Generate a random encryption key?",
    choices: [
      { title: "Yes, generate a 32-character random key", value: true },
      { title: "No, I want to enter my own", value: false },
    ],
    initial: 0,
  });

  if (useRandom) {
    const key = generateEncryptionKey();
    console.log(chalk.green(`\n✓ Generated encryption key: ${chalk.dim(key)}`));
    return key;
  }

  const { customKey } = await prompts({
    type: "text",
    name: "customKey",
    message: "Enter your encryption key (32+ characters recommended):",
    validate: (value) =>
      value.trim().length >= 1 ? true : "Key cannot be empty",
  });

  return customKey.trim();
}

// ─── Site Password ───────────────────────────────────────────────────────────

async function getSitePassword() {
  console.log(chalk.bold("\n── Site Password (Optional) ──\n"));
  console.log(chalk.gray("This will enable site-wide password protection.\n"));

  const { wantPassword } = await prompts({
    type: "select",
    name: "wantPassword",
    message: "Set a site password?",
    choices: [
      { title: "No (skip)", value: false },
      { title: "Yes", value: true },
    ],
    initial: 0,
  });

  if (!wantPassword) {
    return "";
  }

  const { password } = await prompts({
    type: "password",
    name: "password",
    message: "Enter the site password:",
    validate: (value) =>
      value.trim().length >= 1 ? true : "Password cannot be empty",
  });

  return password.trim();
}

// ─── Generate .env ──────────────────────────────────────────────────────────

async function generateEnv(serviceAccountB64, encryptionKey, sitePassword, domain = "") {
  console.log(chalk.bold("\n── Generating .env File ──\n"));

  const envPath = path.join(ROOT_DIR, ".env");

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const { overwrite } = await prompts({
      type: "select",
      name: "overwrite",
      message: ".env file already exists. Overwrite?",
      choices: [
        { title: "No, abort", value: false },
        { title: "Yes, overwrite", value: true },
      ],
      initial: 1,
    });

    if (!overwrite) {
      console.log(chalk.yellow("\n✗ Setup aborted. Existing .env file was not modified.\n"));
      process.exit(0);
    }
  }

  const spinner = ora("Writing .env file...").start();
  await sleep(500);

  const envContent = `# Base64 Encoded Service Account JSON
GD_SERVICE_B64=${serviceAccountB64}

# Secret Key for Encryption
ENCRYPTION_KEY=${encryptionKey}

# Index password, used when private mode is enabled
SITE_PASSWORD=${sitePassword}

# [Optional] Only domain, without protocol (ex: mbaharip.com)
# Needed if you're not using Vercel
NEXT_PUBLIC_DOMAIN=${domain}
`;

  fs.writeFileSync(envPath, envContent, "utf-8");
  spinner.succeed(".env file generated successfully");

  console.log(chalk.green("\n✅ .env generado exitosamente"));
  console.log(chalk.gray("  File location: ") + chalk.cyan(envPath));
  console.log(chalk.yellow("  ⚠ Si tu organización tiene políticas de rotación de keys,"));
  console.log(chalk.yellow("    esta credencial puede expirar. En ese caso, vuelve a correr npm run setup."));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  welcome();

  // Step 1: Google Cloud Project
  const projectId = await checkGCloudProject();

  // Step 2: Drive API
  await checkDriveAPI(projectId);

  // Step 3: Service Account
  await checkServiceAccount();

  // Step 4: Load Service Account JSON
  const serviceAccount = await loadServiceAccount();

  // Step 5: Encode Service Account
  const serviceAccountB64 = encodeServiceAccount(serviceAccount);

  // Step 6: Share folder instructions
  await shareFolderInstructions(serviceAccount.client_email);

  // Step 7: List folders and select root
  let selectedFolder = null;
  while (!selectedFolder) {
    selectedFolder = await listDriveFolders(serviceAccount);
    if (!selectedFolder) {
      const { retry } = await prompts({
        type: "select",
        name: "retry",
        message: "Failed to load folders. Retry?",
        choices: [
          { title: "Yes, try again", value: true },
          { title: "No, abort", value: false },
        ],
        initial: 0,
      });
      if (!retry) {
        console.log(chalk.yellow("\n✗ Setup aborted.\n"));
        process.exit(0);
      }
    }
  }

  console.log(chalk.green(`\n✓ Selected folder: ${chalk.bold(selectedFolder.path)}`));
  console.log(chalk.gray(`  Folder ID: ${selectedFolder.id}\n`));

  // Step 8: Encryption Key
  const encryptionKey = await getEncryptionKey();

  // Step 9: Site Password (optional)
  const sitePassword = await getSitePassword();

  // Step 10: Generate .env
  await generateEnv(serviceAccountB64, encryptionKey, sitePassword);

  // Step 11: Update gIndex.config.ts with encrypted folder ID
  await updateGIndexConfig(selectedFolder, encryptionKey);

  console.log(chalk.bold.cyan("\n┌─────────────────────────────────────────┐"));
  console.log(chalk.bold.cyan("│  Setup complete! 🎉                  │"));
  console.log(chalk.bold.cyan("└─────────────────────────────────────────┘\n"));
  console.log(chalk.gray("  Files created/updated:"));
  console.log(chalk.gray("  ✓ ") + chalk.cyan(".env") + chalk.gray(" (environment variables)"));
  console.log(chalk.gray("  ✓ ") + chalk.cyan("src/config/gIndex.config.ts") + chalk.gray(" (configuration)"));
  console.log(chalk.gray("\n  Next steps:"));
  console.log(chalk.gray("  1. Run ") + chalk.cyan("npm install") + chalk.gray(" (if not already done)"));
  console.log(chalk.gray("  2. Run ") + chalk.cyan("npm run dev") + chalk.gray(" to start the development server"));
  console.log(chalk.gray("  3. Open ") + chalk.cyan("http://localhost:3000") + chalk.gray(" in your browser\n"));
}

// Run
main().catch((err) => {
  console.error(chalk.red("\n✗ An error occurred:"), err.message);
  process.exit(1);
});
