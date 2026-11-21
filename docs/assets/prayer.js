"use strict";

(() => {
  const timeZone = "Asia/Riyadh";
  const locale = typeof zadServiceLocale === "string" ? zadServiceLocale : "ar";
  const method = 4;
  const school = 0;
  const prayers = [
    ["Fajr", "الفجر"], ["Dhuhr", "الظهر"], ["Asr", "العصر"],
    ["Maghrib", "المغرب"], ["Isha", "العشاء"]
  ];
  const form = document.querySelector("#prayer-form");
  const citySelect = document.querySelector("#city");
  const times = document.querySelector("#times");
  const status = document.querySelector("#prayer-status");
  let currentRequest;

  function prayerMessage(key, fallback) {
    return typeof zadServiceText === "function" ? zadServiceText("prayer", key, fallback) : fallback;
  }

  function matchesRequest(data, latitude, longitude, date) {
    const meta = data?.meta;
    return data?.date?.gregorian?.date === date &&
      meta?.timezone === timeZone &&
      meta.method?.id === method &&
      meta.school === "STANDARD" &&
      Number.isFinite(meta.latitude) && Math.abs(meta.latitude - latitude) <= 0.001 &&
      Number.isFinite(meta.longitude) && Math.abs(meta.longitude - longitude) <= 0.001;
  }

  function prayerRows(timings) {
    let previousMinutes = -1;
    return prayers.map(([key, label]) => {
      const rawTime = timings?.[key];
      const value = typeof rawTime === "string" &&
        rawTime.trim().match(/^((?:[01]\d|2[0-3]):[0-5]\d)(?: \([A-Za-z0-9+:-]{1,12}\))?$/)?.[1];
      if (!value) throw new Error("Missing or invalid prayer time");
      const minutes = Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
      if (minutes <= previousMinutes) throw new Error("Prayer times are out of order");
      previousMinutes = minutes;

      const row = document.createElement("div");
      const name = document.createElement("span");
      const time = document.createElement("strong");
      name.textContent = prayerMessage(key, label);
      time.textContent = value;
      time.dir = "ltr";
      row.append(name, time);
      return row;
    });
  }

  async function loadTimes() {
    currentRequest?.abort();
    const request = new AbortController();
    currentRequest = request;
    times.replaceChildren();

    const city = citySelect.selectedOptions[0];
    const latitude = Number(city?.dataset.latitude);
    const longitude = Number(city?.dataset.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      status.textContent = prayerMessage("choose", "اختر مدينة سعودية من القائمة.");
      currentRequest = undefined;
      return;
    }

    const params = new URLSearchParams({
      latitude, longitude, method, school, timezonestring: timeZone
    });
    const today = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone, day: "2-digit", month: "2-digit", year: "numeric"
    }).formatToParts(today).map(({ type, value }) => [type, value]));
    const date = [parts.day, parts.month, parts.year].join("-");
    const localDate = new Intl.DateTimeFormat(locale, {
      timeZone, calendar: "gregory", dateStyle: "full"
    }).format(today);
    const caption = [
      city.textContent, localDate, prayerMessage("method", "أم القرى"),
      prayerMessage("school", "العصر وفق حساب الجمهور")
    ].join(" · ");
    status.textContent = prayerMessage("loading", "جارٍ تحميل المواقيت") + " · " + caption;
    const timeout = setTimeout(() => request.abort(), 9000);

    try {
      const response = await fetch("https://api.aladhan.com/v1/timings/" + date + "?" + params, {
        signal: request.signal
      });
      if (!response.ok) throw new Error("Prayer API request failed");
      const { code, data } = await response.json();
      if (code !== 200 || !matchesRequest(data, latitude, longitude, date)) {
        throw new Error("Prayer response does not match the selected city and date");
      }

      const rows = prayerRows(data.timings);
      if (currentRequest === request) {
        times.replaceChildren(...rows);
        status.textContent = caption + " · " + prayerMessage("clock", "بنظام ٢٤ ساعة");
      }
    } catch {
      if (currentRequest === request) {
        status.textContent = prayerMessage("failed", "تعذر تحميل مواقيت مطابقة للطلب. حاول مجددًا أو راجع التقويم المحلي.") + " · " + caption;
      }
    } finally {
      clearTimeout(timeout);
      if (currentRequest === request) currentRequest = undefined;
    }
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    loadTimes();
  });
  citySelect.addEventListener("change", loadTimes);
})();
