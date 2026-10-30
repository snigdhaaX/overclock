# TRUSTCHAIN (Overclock)

TRUSTCHAIN is an intelligent supply chain disruption management and control tower platform featuring an Expo/React Native mobile application and backend decision-support framework.

---

## 📱 Mobile Application (Expo / React Native)

The root project contains the mobile application built with Expo Router and React Native, tailored for supply chain stakeholders:
- **Operations Analyst**: Disruption identification, risk scoring, impact analysis, recovery plan generation and simulation.
- **Supply Chain Manager**: Disruption management, supplier/warehouse analytics, order approvals, route intelligence, and live network maps.
- **Warehouse Operator**: Shift management, task assignment, barcode scanning, inbound cargo gate checks, and floor plan navigation.

### Quick Start (Mobile)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

3. **Run on specific platforms:**
   ```bash
   npm run android  # Run on Android emulator / device
   npm run ios      # Run on iOS simulator
   npm run web      # Run on web
   ```

4. **Typecheck & Lint:**
   ```bash
   npx tsc --noEmit
   npx expo lint
   ```

---

## ⚙️ Backend & Framework

See [`TRUSTCHAIN_Basic_Framework/`](TRUSTCHAIN_Basic_Framework/) for the backend decision-support services, risk engines, and starter API implementations.
