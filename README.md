## Steps left to setup

1. Add your own details for Arduino R4 WiFi setup

```cpp
#define WIFI_SSID // Add your own values
#define WIFI_PASSWORD // Add your own values

#define FIREBASE_HOST // Add your own values
#define FIREBASE_AUTH // Add your own values
```

2. Add a file called firebase.jsx with the firebase config details:

```javascript
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  // Add your firebase config details here (copy paste during firebase project creation)
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
```
