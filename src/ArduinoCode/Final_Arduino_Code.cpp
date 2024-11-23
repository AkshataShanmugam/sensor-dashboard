#include <WiFi.h>
#include <FirebaseESP32.h>
#include <DHT11.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

#define WIFI_SSID // Add your own values
#define WIFI_PASSWORD // Add your own values

#define FIREBASE_HOST // Add your own values
#define FIREBASE_AUTH // Add your own values

#define DHTPIN 2
#define MQ135_PIN A0
#define LDR_PIN 7
#define LED_PIN LED_BUILTIN
#define PIR_PIN 8

DHT11 dht(DHTPIN);
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

WiFiUDP udp;
NTPClient timeClient(udp, "pool.ntp.org", 19800, 60000); // IST timezone

// Variables to store system date and time
int systemYear, systemMonth, systemDay, systemHour, systemMinute, systemSecond;
bool sleepMode = false;

void setup() {
  Serial.begin(9600);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi");

  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);

  pinMode(LDR_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);

  timeClient.begin();
  timeClient.update();

  // Initialize system time with NTP time
  unsigned long epochTime = timeClient.getEpochTime();  // Epoch time in seconds
  epochTime += 19800;
  setSystemTime(epochTime);
}

void loop() {
  // Check Firebase for sleep mode status
  if (Firebase.getBool(firebaseData, "/user_data/sleep_mode")) {
    if (firebaseData.dataType() == "boolean") {
      sleepMode = firebaseData.boolData();
      Serial.print("Sleep Mode: ");
      Serial.println(sleepMode ? "Enabled" : "Disabled");
    } else {
      Serial.println("Failed to retrieve sleep mode value");
    }
  } else {
    Serial.println("Error reading from Firebase: " + firebaseData.errorReason());
  }

  // Control the light based on LDR and sleep mode
  int ldrValue = digitalRead(LDR_PIN);
  int pirValue = digitalRead(PIR_PIN);
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int airQuality = analogRead(MQ135_PIN);
  Serial.print("LDR Value: ");
  Serial.print(ldrValue);
  Serial.print("\tTemperature Value: ");
  Serial.print(temperature);
  Serial.print("C \tHumidity Value: ");
  Serial.print(humidity);
  Serial.print("\t Air Quality Value: ");
  Serial.println(airQuality);

  bool lightOn = false;
  if (ldrValue && (!sleepMode || pirValue)) { // LOW indicates low light
    digitalWrite(LED_PIN, HIGH); // Turn on the light
    lightOn = true;
    Serial.println("Light turned ON due to low light, motion detected and sleep mode disabled");
  } else {
    digitalWrite(LED_PIN, LOW); // Turn off the light
    Serial.println("Light turned OFF");
  }

  // Update system time
  updateSystemTime();
  // Format the system date and time
  String formattedDateTime = getFormattedDateTime();
  String formattedDateTime2 = getFormattedDateTime();
  Serial.println("Formatted System Time: " + formattedDateTime);

  // Upload data to Firebase
  formattedDateTime.replace(" ", "_");
  formattedDateTime.replace(":", "-");
  String path = "/sensor_data/" + formattedDateTime;
  Firebase.setString(firebaseData, path + "/timestamp", formattedDateTime2);
  Firebase.setBool(firebaseData, path + "/sleep_mode", sleepMode);
  Firebase.setInt(firebaseData, path + "/ldr_value", ldrValue);
  Firebase.setInt(firebaseData, path + "/pir_value", pirValue);
  Firebase.setInt(firebaseData, path + "/air_quality", airQuality);
  Firebase.setInt(firebaseData, path + "/temperature", temperature);
  Firebase.setInt(firebaseData, path + "/humidity", humidity);
  Firebase.setBool(firebaseData, path + "/light_on", lightOn);

  if (firebaseData.httpCode() == 200) {
    Serial.println("Data uploaded successfully.");
  } else {
    Serial.println("Error uploading data: " + firebaseData.errorReason());
  }

  delay(10000);  // 1-second delay
}

// Function to initialize system time
void setSystemTime(unsigned long epochTime) {
  systemYear = 1970;
  systemMonth = 1;
  systemDay = 1;

  // Convert epoch time to system date and time
  while (epochTime >= 31556926) { // Seconds in a year (excluding leap years)
    systemYear++;
    epochTime -= (isLeapYear(systemYear) ? 31622400 : 31536000);
  }
  while (epochTime >= (isLeapYear(systemYear) ? 2678400 : 2419200)) {
    systemMonth++;
    epochTime -= (isLeapYear(systemYear) && systemMonth == 2 ? 2505600 : daysInMonth(systemMonth, systemYear) * 86400);
  }
  systemDay += epochTime / 86400;
  epochTime %= 86400;
  systemHour = epochTime / 3600;
  epochTime %= 3600;
  systemMinute = epochTime / 60;
  systemSecond = epochTime % 60;
}

// Function to update system time
void updateSystemTime() {
  systemSecond++;
  if (systemSecond >= 60) {
    systemSecond = 0;
    systemMinute++;
    if (systemMinute >= 60) {
      systemMinute = 0;
      systemHour++;
      if (systemHour >= 24) {
        systemHour = 0;
        systemDay++;
        if (systemDay > daysInMonth(systemMonth, systemYear)) {
          systemDay = 1;
          systemMonth++;
          if (systemMonth > 12) {
            systemMonth = 1;
            systemYear++;
          }
        }
      }
    }
  }
}

// Function to get the formatted date and time
String getFormattedDateTime() {
  String monthNames[] = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
  String formattedTime = String(systemDay) + "-" + monthNames[systemMonth - 1] + "-" + String(systemYear) + " ";
  formattedTime += (systemHour < 10 ? "0" : "") + String(systemHour) + ":";
  formattedTime += (systemMinute < 10 ? "0" : "") + String(systemMinute) + ":";
  formattedTime += (systemSecond < 10 ? "0" : "") + String(systemSecond);
  return formattedTime;
}

// Helper function to check if a year is a leap year
bool isLeapYear(int year) {
  return ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0));
}

// Helper function to get the number of days in a month
int daysInMonth(int month, int year) {
  if (month == 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month == 4 || month == 6 || month == 9 || month == 11) {
    return 30;
  }
  return 31;
}
