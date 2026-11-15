// ==UserScript==
// @name         TJK Lokal Panel Koprusu (Kagit Kontrol Birimi)
// @namespace    https://github.com/
// @version      1.0
// @description  United Racing - Lokal kontrol paneline tjk.org verilerini otomatik aktarir
// @match        file:///*
// @grant        GM_xmlhttpRequest
// @connect      tjk.org
// @connect      www.tjk.org
// @connect      *.tjk.org
// @updateURL    BURAYA_YENI_DOSYANIN_GITHUB_RAW_LINKI_GELECEK
// @downloadURL  BURAYA_YENI_DOSYANIN_GITHUB_RAW_LINKI_GELECEK
// ==/UserScript==

(function() {
    'use strict';

    // Yalnizca bizim lokal kontrol paneli HTML dosyamizda aktif ol
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

    function gmGetHtml(url) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
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
            var raceTable = findRaceTable(container);
            if (raceTable) {
                var cells = raceTable.querySelectorAll('.gunluk-GunlukYarisProgrami-AtAdi');
                horseCount = cells.length > 0 ? cells.length : raceTable.querySelectorAll('tbody tr').length;
            }

            return {
                raceNo: raceNo,
                horseCount: horseCount,
                singleBets: singleBets,
                multiBets: multiBets
            };
        });

        return { trackName: trackName, races: races };
    }

    async function fetchAllFromTjk(pinfo) {
        var parser = new DOMParser();
        var baseUrl = "https://www.tjk.org/TR/YarisSever/Info/Page/GunlukYarisProgrami";
        var targetUrl = baseUrl;

        // TXT dosyasindaki Pinfo=YYYYMMDD tarihini URL'ye ekle
        if (pinfo && /^\d{8}$/.test(pinfo)) {
            var dd = pinfo.slice(6, 8);
            var mm = pinfo.slice(4, 6);
            var yyyy = pinfo.slice(0, 4);
            targetUrl = baseUrl + "?QueryParameter_Tarih=" + dd + "%2F" + mm + "%2F" + yyyy;
        }

        var mainHtml = await gmGetHtml(targetUrl);
        var mainDoc = parser.parseFromString(mainHtml, 'text/html');
        var tabLinks = Array.from(mainDoc.querySelectorAll('ul.gunluk-tabs li a'));

        // Tarih parametresi bos donerse varsayilan gunluk sayfayi dene
        if (tabLinks.length === 0 && targetUrl !== baseUrl) {
            mainHtml = await gmGetHtml(baseUrl);
            mainDoc = parser.parseFromString(mainHtml, 'text/html');
            tabLinks = Array.from(mainDoc.querySelectorAll('ul.gunluk-tabs li a'));
        }

        if (tabLinks.length === 0) {
            throw new Error("TJK.org sayfasinda gunluk program sekmeleri bulunamadi.");
        }

        var programs = await Promise.all(tabLinks.map(async function(tabEl) {
            var trackName = tabEl.innerText.trim();
            var rawHref = tabEl.getAttribute('href') || "";

            if (!rawHref || rawHref === "#" || tabEl.classList.contains('current')) {
                return parseTrackDoc(mainDoc, trackName);
            }

            var fullUrl = new URL(rawHref, "https://www.tjk.org").href;
            var tabHtml = await gmGetHtml(fullUrl);
            var tabDoc = parser.parseFromString(tabHtml, 'text/html');
            return parseTrackDoc(tabDoc, trackName);
        }));

        return programs;
    }

    window.addEventListener('tjk-request-live-data', async function(ev) {
        var pinfo = (ev.detail && ev.detail.pinfo) ? ev.detail.pinfo : "";
        try {
            var programs = await fetchAllFromTjk(pinfo);
            window.dispatchEvent(new CustomEvent('tjk-live-data-response', {
                detail: { ok: true, programs: programs }
            }));
        } catch (err) {
            window.dispatchEvent(new CustomEvent('tjk-live-data-response', {
                detail: { ok: false, error: err.message }
            }));
        }
    });

    window.TJK_BRIDGE_READY = true;
    window.dispatchEvent(new Event('tjk-bridge-ready'));
})();