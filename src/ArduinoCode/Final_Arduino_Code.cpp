#include <WiFi.h>
#include <FirebaseESP32.h>
#include <DHT11.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <TimeLib.h> // Time management library

#define WIFI_SSID "Redmi Note 10S"
#define WIFI_PASSWORD "0000 0000"

#define FIREBASE_HOST "https://iotelderlycare-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "sJUC2NjiIu5EtTKHUxQU5HLdM4QEO4tWRuC3ZHps"

#define DHTPIN 2
#define MQ135_PIN A0
#define LDR_PIN 7
#define LED_PIN LED_BUILTIN
#define PIR_PIN 12

DHT11 dht(DHTPIN);
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

WiFiUDP udp;
NTPClient timeClient(udp, "pool.ntp.org", 0, 60000); // Get UTC time

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
  syncTimeWithNTP();
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

  // Format the system date and time
  String formattedDateTime = getFormattedDateTime();
  Serial.println("Formatted System Time: " + formattedDateTime);

  // Upload data to Firebase
  formattedDateTime.replace(" ", "_");
  formattedDateTime.replace(":", "-");
  String path = "/sensor_data/" + formattedDateTime;
  Firebase.setString(firebaseData, path + "/timestamp", formattedDateTime);
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

  // Sync with NTP every 10 minutes
  static unsigned long lastSync = 0;
  if (millis() - lastSync > 600000) {
    syncTimeWithNTP();
    lastSync = millis();
  }

  delay(10000);  // 10-second delay
}

// Function to sync time with NTP server
void syncTimeWithNTP() {
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  epochTime += 19800; // Add IST offset
  setTime(epochTime); // Set time using TimeLib
}

// Function to get the formatted date and time
String getFormattedDateTime() {
  String formattedTime = String(day()) + "-" + monthShortStr(month()) + "-" + String(year()) + " ";
  formattedTime += (hour() < 10 ? "0" : "") + String(hour()) + ":";
  formattedTime += (minute() < 10 ? "0" : "") + String(minute()) + ":";
  formattedTime += (second() < 10 ? "0" : "") + String(second());
  return formattedTime;
}
