"use strict";

(() => {
  const timeZone = "Asia/Riyadh";
  const locale = typeof zadServiceLocale === "string" ? zadServiceLocale : "ar";
  const method = 4;
  const school = 0;
  const cityKey = "zad-prayer-city-v1";
  const prayers = [
    ["Fajr", "الفجر"], ["Dhuhr", "الظهر"], ["Asr", "العصر"],
    ["Maghrib", "المغرب"], ["Isha", "العشاء"]
  ];
  const requestDateFormat = new Intl.DateTimeFormat("en-GB", {
    timeZone, calendar: "gregory", numberingSystem: "latn",
    day: "2-digit", month: "2-digit", year: "numeric"
  });
  const displayDateFormat = new Intl.DateTimeFormat(locale, {
    timeZone, calendar: "gregory", dateStyle: "full"
  });

  function prayerMessage(key, fallback) {
    return typeof zadServiceText === "function" ? zadServiceText("prayer", key, fallback) : fallback;
  }

  function saudiDate(date = new Date()) {
    const parts = Object.fromEntries(requestDateFormat.formatToParts(date).map(({ type, value }) => [type, value]));
    return [parts.day, parts.month, parts.year].join("-");
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

  function prayerRows(timings, compact) {
    let previousMinutes = -1;
    return prayers.map(([key, label]) => {
      const rawTime = timings?.[key];
      const value = typeof rawTime === "string" &&
        rawTime.trim().match(/^((?:[01]\d|2[0-3]):[0-5]\d)(?: \([A-Za-z0-9+:-]{1,12}\))?$/)?.[1];
      if (!value) throw new Error("Missing or invalid prayer time");
      const minutes = Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
      if (minutes <= previousMinutes) throw new Error("Prayer times are out of order");
      previousMinutes = minutes;

      const row = document.createElement(compact ? "li" : "div");
      const name = document.createElement("span");
      const time = document.createElement(compact ? "time" : "strong");
      name.textContent = prayerMessage(key, label);
      time.textContent = value;
      time.dir = "ltr";
      if (compact) time.dateTime = value;
      row.append(name, time);
      return row;
    });
  }

  function searchableCityName(name) {
    return name.normalize("NFKD").replace(/\p{M}|ـ/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/[ىيی]/g, "ي").replace(/[ةہ]/g, "ه")
      .replace(/[’‘'`-]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  }

  function setupCityDirectory(widget, select) {
    const search = widget.querySelector("[data-city-search]");
    const input = search.querySelector("input");
    const feedback = search.querySelector("small");
    const entries = [...select.options].map(option => ({
      option, names: [searchableCityName(option.textContent), searchableCityName(option.value)]
    }));
    const regions = {
      "02": ["الباحة", "Al Bahah"], "05": ["المدينة المنورة", "Medina"],
      "06": ["الشرقية", "Eastern Province"], "08": ["القصيم", "Al Qassim"],
      "10": ["الرياض", "Riyadh"], "11": ["عسير", "Asir"],
      "13": ["حائل", "Hail"], "14": ["مكة المكرمة", "Mecca"],
      "15": ["الحدود الشمالية", "Northern Borders"], "16": ["نجران", "Najran"],
      "17": ["جازان", "Jazan"], "19": ["تبوك", "Tabuk"], "20": ["الجوف", "Al Jawf"]
    };
    if (typeof zadSaudiPlaces !== "undefined") {
      for (const [id, latin, arabic, chinese, latitude, longitude, region] of zadSaudiPlaces) {
        const name = (locale === "ar" || locale === "ur") && arabic ? arabic :
          locale === "zh" && chinese ? chinese : latin;
        const area = regions[region];
        const areaLabel = area?.[locale === "ar" || locale === "ur" ? 0 : 1];
        const option = new Option(areaLabel ? name + " · " + areaLabel : name, "geo-" + id);
        option.dataset.latitude = latitude;
        option.dataset.longitude = longitude;
        entries.push({option, names: [name, latin, arabic, chinese, ...(area || [])].map(searchableCityName)});
      }
      search.hidden = false;
    }
    const ids = new Map(entries.map(entry => [entry.option.value, entry.option]));

    function show(value = select.value) {
      const words = searchableCityName(input.value).split(" ").filter(Boolean);
      const matches = entries.filter(({names}) =>
        words.every(word => names.some(name => name.includes(word))));
      const options = matches.map(({option}) => option);
      const selected = ids.get(value);
      if (selected && !options.includes(selected)) options.unshift(selected);
      select.replaceChildren(...options);
      if (selected) select.value = value;
      feedback.textContent = matches.length ? "" : feedback.dataset.empty;
      return matches;
    }

    input.addEventListener("input", () => show());
    input.addEventListener("keydown", event => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      const matches = show();
      if (input.value.trim() && matches.length === 1) {
        select.value = matches[0].option.value;
        select.dispatchEvent(new Event("change"));
      }
      select.focus();
    });
    show();
    return {ids, show};
  }

  function initializePrayer(widget) {
    const compact = widget.hasAttribute("data-prayer-compact");
    const form = widget.querySelector("form");
    const citySelect = widget.querySelector("[data-prayer-city]");
    const times = widget.querySelector("[data-prayer-times]");
    const status = widget.querySelector("[data-prayer-status]");
    const retry = widget.querySelector("[data-prayer-retry]");
    const cityDirectory = setupCityDirectory(widget, citySelect);
    const cityIds = cityDirectory.ids;
    let currentRequest;
    let requestedDay;

    function restoreCity() {
      try {
        const saved = localStorage.getItem(cityKey);
        if (cityIds.has(saved) && saved !== citySelect.value) {
          cityDirectory.show(saved);
          return true;
        }
      } catch {
        // Prayer times remain available with storage disabled.
      }
      return false;
    }

    function saveCity() {
      if (!cityIds.has(citySelect.value)) return;
      try {
        localStorage.setItem(cityKey, citySelect.value);
      } catch {
        // The current selection still works without persistence.
      }
    }

    async function loadTimes() {
      currentRequest?.abort();
      const request = new AbortController();
      currentRequest = request;
      times.replaceChildren();
      if (compact) times.hidden = true;
      if (retry) {
        if (document.activeElement === retry) citySelect.focus();
        retry.hidden = true;
      }

      const city = citySelect.selectedOptions[0];
      const latitude = Number(city?.dataset.latitude);
      const longitude = Number(city?.dataset.longitude);
      if (!cityIds.has(city?.value) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        status.textContent = prayerMessage("choose", "اختر مدينة سعودية من القائمة.");
        currentRequest = undefined;
        requestedDay = undefined;
        times.removeAttribute("aria-busy");
        return;
      }

      const today = new Date();
      const date = saudiDate(today);
      requestedDay = date;
      const cityAndDate = city.textContent + " · " + displayDateFormat.format(today);
      const caption = compact ? city.textContent : [
        cityAndDate, prayerMessage("method", "أم القرى"), prayerMessage("school", "العصر وفق حساب الجمهور")
      ].join(" · ");
      status.textContent = prayerMessage("loading", "جارٍ تحميل المواقيت") + " · " + caption;
      times.setAttribute("aria-busy", "true");
      const params = new URLSearchParams({latitude, longitude, method, school, timezonestring: timeZone});
      const timeout = setTimeout(() => request.abort(), 9000);

      try {
        const response = await fetch("https://api.aladhan.com/v1/timings/" + date + "?" + params, {
          signal: request.signal
        });
        if (!response.ok) throw new Error("Prayer API request failed");
        const { code, data } = await response.json();
        if (request.signal.aborted || code !== 200 || !matchesRequest(data, latitude, longitude, date)) {
          throw new Error("Prayer response does not match the selected city and date");
        }
        if (currentRequest !== request) return;
        if (date !== saudiDate()) {
          loadTimes();
          return;
        }

        times.replaceChildren(...prayerRows(data.timings, compact));
        times.hidden = false;
        status.textContent = caption + " · " + prayerMessage("clock", "بنظام ٢٤ ساعة");
      } catch {
        if (currentRequest === request) {
          if (date !== saudiDate()) {
            loadTimes();
            return;
          }
          const message = compact ? widget.dataset.prayerFailure :
            prayerMessage("failed", "تعذر تحميل مواقيت مطابقة للطلب. حاول مجددًا أو راجع التقويم المحلي.");
          status.textContent = message + " · " + caption;
          if (retry) retry.hidden = false;
        }
      } finally {
        clearTimeout(timeout);
        if (currentRequest === request) {
          currentRequest = undefined;
          times.removeAttribute("aria-busy");
        }
      }
    }

    function refreshChangedDate() {
      if (!document.hidden && requestedDay && requestedDay !== saudiDate()) loadTimes();
    }

    function watchDayBoundary() {
      // Saudi midnight is on a minute boundary, independent of the device's time zone.
      const untilNextMinute = 60_000 - Date.now() % 60_000;
      setTimeout(() => {
        refreshChangedDate();
        watchDayBoundary();
      }, untilNextMinute);
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      loadTimes();
    });
    citySelect.addEventListener("change", () => {
      saveCity();
      loadTimes();
    });
    window.addEventListener("pageshow", () => {
      if (restoreCity() && requestedDay) loadTimes();
      else refreshChangedDate();
    });
    document.addEventListener("visibilitychange", refreshChangedDate);
    restoreCity();
    if (compact) loadTimes();
    watchDayBoundary();
  }

  for (const widget of document.querySelectorAll("[data-prayer-widget]")) initializePrayer(widget);
})();
