// ==UserScript==
// @name         TJK Lokal Panel Koprusu (Kagit Kontrol Birimi)
// @namespace    https://github.com/
// @version      1.4
// @description  United Racing - Lokal kontrol paneline tjk.org verilerini (tarih/Pinfo uyumlu) otomatik aktarir
// @match        file:///*
// @grant        GM_xmlhttpRequest
// @connect      tjk.org
// @connect      www.tjk.org
// @connect      *.tjk.org
// @updateURL    https://github.com/kyozdemir/tjk-bet-control/raw/refs/heads/main/tjk-panel-kopru.user.js
// @downloadURL  https://github.com/kyozdemir/tjk-bet-control/raw/refs/heads/main/tjk-panel-kopru.user.js
// ==/UserScript==

(function() {
    'use strict';

    if (!document.getElementById('tjk-local-qa-app')) return;

    var TR_I = "\u0130";
    var TR_U = "\u00dc";
    var TR_S = "\u015e";
    var TR_C = "\u00c7";

    var RX_FIRST = new RegExp("(?:^|\\s)1\\s*\\.");
    var RX_SECOND = new RegExp("(?:^|\\s)2\\s*\\.");
    var RX_6G = new RegExp("6['\\u2019\\s]*L[I\\u0130]\\s*GANYAN");
    var RX_5G = new RegExp("5['\\u2019\\s]*L[I\\u0130]\\s*GANYAN");
    var RX_4G = new RegExp("4['\\u2019\\s]*L[U\\u00dc]\\s*GANYAN");
    var RX_3G = new RegExp("3['\\u2019\\s]*L[U\\u00dc]\\s*GANYAN");
    var RX_7G = new RegExp("7['\\u2019\\s]*L[I\\u0130]\\s*GANYAN");
    var RX_7P = new RegExp("7['\\u2019\\s]*L[I\\u0130]\\s*PLASE");
    var RX_5B = new RegExp("5['\\u2019\\s]*L[I\\u0130]\\s*BAH[I\\u0130]S");
    var RX_3B = new RegExp("3['\\u2019\\s]*L[U\\u00dc]\\s*BAH[I\\u0130]S");

    function gmRequestHtml(options) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: options.method || "GET",
                url: options.url,
                headers: options.headers || {},
                data: options.data || undefined,
                onload: function(res) {
                    if (res.status >= 200 && res.status < 400) {
                        resolve(res.responseText);
                    } else {
                        reject(new Error("HTTP " + res.status));
                    }
                },
                onerror: function() {
                    reject(new Error("TJK.org ag baglantisi kurulamadi."));
                }
            });
        });
    }

    function findRaceTable(container) {
        var wrapper = container;
        while (wrapper.parentElement && wrapper.parentElement.querySelectorAll('.bahisTipiGridContainer').length === 1) {
            wrapper = wrapper.parentElement;
        }
        if (wrapper !== container) {
            var tbl = wrapper.querySelector('table');
            if (tbl) return tbl;
        }
        var prev = container.previousElementSibling;
        while (prev) {
            if (prev.classList && prev.classList.contains('bahisTipiGridContainer')) break;
            if (prev.tagName === 'TABLE') return prev;
            var nested = prev.querySelector ? prev.querySelector('table') : null;
            if (nested) return nested;
            prev = prev.previousElementSibling;
        }
        return null;
    }

    function parseTrackDoc(doc, trackName) {
        var betContainers = Array.from(doc.querySelectorAll('.bahisTipiGridContainer'));
        var races = betContainers.map(function(container, index) {
            var raceNo = index + 1;
            var betCards = container.querySelectorAll('.bahisTipiCard');
            var singleBets = [];
            var multiBets = [];

            betCards.forEach(function(card) {
                var text = card.innerText.replace(/\s+/g, ' ').trim().toLocaleUpperCase('tr-TR');
                if (text.includes("SAB" + TR_I + "T")) return;

                var hasFirst = RX_FIRST.test(text);
                var hasSecond = RX_SECOND.test(text);
                var isMulti = false;

                if (RX_6G.test(text)) { isMulti = true; multiBets.push(hasFirst ? "1. 6G" : (hasSecond ? "2. 6G" : "6G")); }
                if (RX_5G.test(text)) { isMulti = true; multiBets.push(hasFirst ? "1. 5G" : (hasSecond ? "2. 5G" : "5G")); }
                if (RX_4G.test(text)) { isMulti = true; multiBets.push(hasFirst ? "1. 4G" : (hasSecond ? "2. 4G" : "4G")); }
                if (RX_3G.test(text)) { isMulti = true; multiBets.push(hasFirst ? "1. 3G" : (hasSecond ? "2. 3G" : "3G")); }
                if (RX_7G.test(text)) { isMulti = true; multiBets.push("7G"); }
                if (RX_7P.test(text)) { isMulti = true; multiBets.push("7P"); }
                if (isMulti) return;

                var plaseIkiliStr = "PLASE " + TR_I + "K" + TR_I + "L" + TR_I;
                var siraliIkiliStr = "SIRALI " + TR_I + "K" + TR_I + "L" + TR_I;
                var ikiliStr = TR_I + "K" + TR_I + "L" + TR_I;

                if (text.includes(plaseIkiliStr)) { if (!singleBets.includes("PI")) singleBets.push("PI"); }
                else if (text.includes("PLASE")) { if (!singleBets.includes("P")) singleBets.push("P"); }

                if (text.includes(siraliIkiliStr)) { if (!singleBets.includes("Io")) singleBets.push("Io"); }
                else if (text.includes(ikiliStr) && !text.includes(plaseIkiliStr)) { if (!singleBets.includes("I")) singleBets.push("I"); }

                if (text.includes("GANYAN") && !singleBets.includes("G")) singleBets.push("G");
                if ((text.includes(TR_U + TR_C + "L" + TR_U) || RX_3B.test(text)) && !singleBets.includes("U")) singleBets.push("U");
                if (text.includes("TABELA") && !singleBets.includes("T")) singleBets.push("T");
                if ((text.includes("BE" + TR_S + "L" + TR_I) || RX_5B.test(text)) && !singleBets.includes("5B")) singleBets.push("5B");
                if (text.includes(TR_C + TR_I + "FTE") && !singleBets.includes("C")) singleBets.push("C");
            });

            var horseCount = 0;
            var scratchedCount = 0;
            var coupledCount = 0;
            var raceTable = findRaceTable(container);

            if (raceTable) {
                var cells = raceTable.querySelectorAll('.gunluk-GunlukYarisProgrami-AtAdi');
                var rows = cells.length > 0
                    ? Array.from(cells).map(function(td) { return td.closest('tr'); })
                    : Array.from(raceTable.querySelectorAll('tbody tr'));

                horseCount = rows.length;
                rows.forEach(function(tr) {
                    if (!tr) return;
                    var rowText = tr.innerText.toLocaleUpperCase('tr-TR');
                    if (rowText.includes("KO" + TR_S + "MAZ")) scratchedCount++;
                    if (rowText.includes("EK" + TR_U + "R" + TR_I) || tr.querySelector('[class*="ekuri" i]')) coupledCount++;
                });
            }

            return {
                raceNo: raceNo,
                horseCount: horseCount,
                scratchedCount: scratchedCount,
                coupledCount: coupledCount,
                singleBets: singleBets,
                multiBets: multiBets
            };
        });

        return { trackName: trackName, races: races };
    }

    function extractDateFromDoc(doc, tabLinks) {
        var dateInput = doc.querySelector('#QueryParameter_Tarih, input[name="QueryParameter_Tarih"]');
        if (dateInput && dateInput.value && /\d{2}[./]\d{2}[./]\d{4}/.test(dateInput.value)) {
            return dateInput.value.trim().replace(/\./g, '/');
        }
        for (var i = 0; i < tabLinks.length; i++) {
            var href = tabLinks[i].getAttribute('href') || "";
            var m = href.match(/QueryParameter_Tarih=(\d{2})(?:%2F|\/)(\d{2})(?:%2F|\/)(\d{4})/i);
            if (m) {
                return m[1] + "/" + m[2] + "/" + m[3];
            }
        }
        return "";
    }

    async function fetchAllFromTjk(pinfo) {
        var parser = new DOMParser();
        var pageBaseUrl = "https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisProgrami";
        var dataBaseUrl = "https://www.tjk.org/TR/YarisSever/Info/Data/GunlukYarisProgrami";
        var ajaxHeaders = { "X-Requested-With": "XMLHttpRequest" };

        var requestedDate = "";
        var encodedDate = "";
        if (pinfo && /^\d{8}$/.test(pinfo)) {
            var dd = pinfo.slice(6, 8);
            var mm = pinfo.slice(4, 6);
            var yyyy = pinfo.slice(0, 4);
            requestedDate = dd + "/" + mm + "/" + yyyy;
            encodedDate = dd + "%2F" + mm + "%2F" + yyyy;
        }

        var mainDoc = null;
        var tabLinks = [];

        if (requestedDate) {
            // 1. TJK.org AJAX Data endpoint (tarih secici burayi kullanir)
            try {
                var dataGetUrl = dataBaseUrl + "?QueryParameter_Tarih=" + encodedDate;
                var html1 = await gmRequestHtml({ method: "GET", url: dataGetUrl, headers: ajaxHeaders });
                var doc1 = parser.parseFromString(html1, 'text/html');
                var tabs1 = Array.from(doc1.querySelectorAll('ul.gunluk-tabs li a'));
                if (tabs1.length > 0) {
                    mainDoc = doc1;
                    tabLinks = tabs1;
                }
            } catch (e1) {}

            // 2. AJAX POST fallback (bazi ASP.NET MVC aksiyonlari POST bekler)
            if (tabLinks.length === 0) {
                try {
                    var html2 = await gmRequestHtml({
                        method: "POST",
                        url: dataBaseUrl,
                        headers: {
                            "X-Requested-With": "XMLHttpRequest",
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                        },
                        data: "QueryParameter_Tarih=" + encodedDate
                    });
                    var doc2 = parser.parseFromString(html2, 'text/html');
                    var tabs2 = Array.from(doc2.querySelectorAll('ul.gunluk-tabs li a'));
                    if (tabs2.length > 0) {
                        mainDoc = doc2;
                        tabLinks = tabs2;
                    }
                } catch (e2) {}
            }

            // 3. Page endpoint fallback with QueryParameter_Tarih
            if (tabLinks.length === 0) {
                var pageUrlWithDate = pageBaseUrl + "?QueryParameter_Tarih=" + encodedDate;
                var html3 = await gmRequestHtml({ method: "GET", url: pageUrlWithDate });
                var doc3 = parser.parseFromString(html3, 'text/html');
                var tabs3 = Array.from(doc3.querySelectorAll('ul.gunluk-tabs li a'));
                if (tabs3.length > 0) {
                    mainDoc = doc3;
                    tabLinks = tabs3;
                }
            }

            if (tabLinks.length === 0) {
                throw new Error("TJK.org uzerinde " + requestedDate + " tarihli program henuz yayinlanmamis veya sekmeler bulunamadi.");
            }
        } else {
            // Pinfo yoksa bugunun programini cek
            var defaultHtml = await gmRequestHtml({ method: "GET", url: pageBaseUrl });
            mainDoc = parser.parseFromString(defaultHtml, 'text/html');
            tabLinks = Array.from(mainDoc.querySelectorAll('ul.gunluk-tabs li a'));
            if (tabLinks.length === 0) {
                throw new Error("TJK.org sayfasinda gunluk program sekmeleri bulunamadi.");
            }
        }

        var fetchedDate = extractDateFromDoc(mainDoc, tabLinks);

        var programs = await Promise.all(tabLinks.map(async function(tabEl) {
            var trackName = tabEl.innerText.trim();
            var rawHref = tabEl.getAttribute('href') || "";

            var isCurrentTab = !rawHref || rawHref === "#" || rawHref.indexOf("javascript") === 0 || tabEl.classList.contains('current');
            if (isCurrentTab && (!requestedDate || !fetchedDate || fetchedDate === requestedDate)) {
                return parseTrackDoc(mainDoc, trackName);
            }

            var urlObj = new URL(rawHref || dataBaseUrl, "https://www.tjk.org");
            if (requestedDate) {
                urlObj.searchParams.set("QueryParameter_Tarih", requestedDate);
            }
            var tabHtml = await gmRequestHtml({
                method: "GET",
                url: urlObj.href,
                headers: ajaxHeaders
            });
            var tabDoc = parser.parseFromString(tabHtml, 'text/html');
            return parseTrackDoc(tabDoc, trackName);
        }));

        return {
            programs: programs,
            requestedDate: requestedDate,
            fetchedDate: fetchedDate || requestedDate
        };
    }

    function sendResponseToPage(payloadObj) {
        var serialized = JSON.stringify(payloadObj);
        window.dispatchEvent(new CustomEvent('tjk-live-data-response', {
            detail: serialized
        }));
    }

    window.addEventListener('tjk-request-live-data', async function(ev) {
        var reqData = {};
        if (ev && ev.detail) {
            if (typeof ev.detail === 'string') {
                try { reqData = JSON.parse(ev.detail); } catch (e) {}
            } else {
                reqData = ev.detail;
            }
        }
        var pinfo = reqData.pinfo || document.documentElement.dataset.tjkRequestPinfo || "";
        try {
            var result = await fetchAllFromTjk(pinfo);
            sendResponseToPage({
                ok: true,
                programs: result.programs,
                requestedDate: result.requestedDate,
                fetchedDate: result.fetchedDate
            });
        } catch (err) {
            sendResponseToPage({ ok: false, error: err.message });
        }
    });

    document.documentElement.dataset.tjkBridgeReady = "1";
    window.TJK_BRIDGE_READY = true;
    window.dispatchEvent(new Event('tjk-bridge-ready'));
})();
