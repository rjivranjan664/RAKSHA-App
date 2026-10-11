# RAKSHA — Setup Guide

This guide is for a judge who has downloaded RAKSHA app from GitHub repository and wants to run and evaluate the project on a Windows 11 computer.

## 1\. What you need

* Windows 11
* Internet access for downloading dependencies and map tiles
* Node.js 20 LTS: https://nodejs.org/
* A modern browser such as Chrome or Edge
* A Google Gemini API key for live AI calls; a configured TextBee account/device for real SMS tests

## 2\. Review the Download projects file

1. Open the RAKSHA repository page.
2. Confirm that `package.json`, `SETUP-RAKSHA.cmd`, `example.env`, and `START-RAKSHA.cmd` are visible.

## 3\. First-time installation

1. Run the SETUP-RAKSHA.cmd file to install Node.js 20 to your system Wait while it checks Node/npm If Node.js is not already installed.
2. Else you can manually install the Node.js 20 LTS: https://nodejs.org/
3. If needed, installs dependencies using npm install on cmd prompt to the same project directory.
4. Continue only if the script reports success. If it fails, note the complete error text.
5. Change the example.env file name to .env

## 4\. Optional API configuration

The app can be started without adding keys, but some external integrations may use fallback/demo behaviour. Keys belong in the **local `.env` file only**.

### Google Gemini AI (optional)

1. Visit https://aistudio.google.com/apikey and create an API key.
2. Open the local root `.env` in Notepad.
3. Set `GEMINI\\\_API\\\_KEY=your\\\_key\\\_here`. The project template also defines `GEMINI\\\_MODEL` and `GEMINI\\\_BASE\\\_URL`; leave their provided defaults unless the project's current README instructs otherwise.
4. Save the file. Restart the backend after changing environment variables.

If no Gemini key is configured, the project README says an existing deterministic/advisory fallback remains available. Do not assume that fallback is a live AI service.

### TextBee SMS (optional; requires a configured phone/SIM)

1. Visit https://textbee.dev/ and follow its current account and Android device/SIM setup process.
2. Obtain the TextBee API key and configure the device according to TextBee's instructions.
3. In the local `.env`, set `TEXTBEE\\\_API\\\_KEY=your\\\_key\\\_here`. The template provides `TEXTBEE\\\_BASE\\\_URL`.
4. Save and restart the backend. Test only with a phone number you control.

A successful API response can mean the provider accepted a request; it does not prove that the recipient handset received the message. If you do not have TextBee configured, skip this test.

### Change and copy the keys to the .env variable

1. Open the .env file to any text editor and put your recent created keys Gemini and TextBee to the value "my_key"
2. You dont need any other keys to place under .env rest other key and value are system generated and public.

## 5\. Start RAKSHA

1. Double-click `START-RAKSHA.cmd`.
2. Keep both command windows open. One runs the backend/API; the other runs the frontend.
3. Open the citizen-facing application at **http://localhost:5173**.
4. Check backend health at **http://localhost:4000/api/health**.

If the frontend does not open, check the terminal window for the actual port printed by Vite. If either process reports an error, do not assume the application is running correctly.

Manual alternative (two separate Command Prompt windows, both opened in the project root):

Backend window:

```bat
npm run server
```

Frontend window:

```bat
npm run dev
```

## 6\. Accounts and portals

* **Citizen:** use the citizen registration screen to create a test account, if registration is enabled in the current build. Use test data only.
* **Authority:** the repository README documents the demo login `authority@raksha.demo` / `Raksha@123`. This is a local demo credential only; if it does not work in the current build, consult the repository's current README and application login flow rather than guessing credentials. Never use this demo password for a real deployment.

## 7\. Suggested evaluation walkthrough

1. Open the application and note whether the citizen and authority entry points are visible.
2. Register/sign in as a citizen using test data.
3. Review the current location/operating-area prompt and the map. Browser location permission may be requested; if denied, the app may use a clearly marked fallback demo location.
4. Review hazard/warning information and note whether it is identified as demo/simulated.
5. Inspect shelter/resource information. Treat capacity and occupancy as demo information unless the project provides a verified live source.
6. Submit a test incident report and review the authority-side workflow.
7. Test SOS only as an in-app prototype workflow; do not treat it as a call to public emergency dispatch.
8. Review AI advisory behaviour. AI is advisory and should not replace official emergency instructions. If no Gemini key is configured, distinguish fallback behaviour from a live Gemini response.
9. Test SMS only if TextBee is configured and only to a number you control.
10. If testing offline/degraded behaviour, disconnect/reconnect deliberately and note what actually queues and synchronizes; an offline queue is not a guarantee of message delivery.

## 8\. Optional technical verification

Open Command Prompt in the project root and run:

```bat
npm test
npm run build
```

Wait for each command to finish and record its actual result. Do not infer success from the app opening in a browser.

## 9\. Important prototype limitations

* RAKSHA is a prototype, not a certified emergency service.
* The repository does not verify live official SACHET/CAP/IMD/NDMA warning-feed connectivity.
* Hazard scenarios and shelter information may be demo-generated.
* An in-app SOS/report does not itself dispatch public emergency responders.
* AI is advisory and human decision-makers remain responsible for operational actions.
* SMS delivery and offline synchronization are not guaranteed.
* Maps generally require internet access to load external map tiles.

## 10\. Troubleshooting

**`node` or `npm` is not recognized:** install Node.js 20 LTS, reopen Command Prompt, and retry.

**Setup fails during `npm install`:** check internet access and retain the complete npm error output.

**Port 5173 or 4000 is already in use:** close the other development app/service or use the port printed by the terminal.

**AI/SMS does not work:** verify the relevant local `.env` values, provider account/device setup, and restart the backend. Never share your keys in a bug report.

**Authority login fails:** verify the credentials documented in the current repository and use the app's supported login flow. Do not expose password hashes or real credentials.
