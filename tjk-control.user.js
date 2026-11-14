// ==UserScript==
// @name         TJK Program Kontrolcüsü
// @namespace    https://github.com/
// @version      3.1
// @description  United Racing - TJK tekil ve toplu yarış programı bahis kontrol aracı
// @match        *://*.tjk.org/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/kyozdemir/tjk-bet-control/refs/heads/main/tjk-control.user.js
// @downloadURL  https://raw.githubusercontent.com/kyozdemir/tjk-bet-control/refs/heads/main/tjk-control.user.js
// ==/UserScript==

(function() {
    'use strict';

    // 1. N'Lİ BAHİSLERİN BAŞLANGIÇ KOŞULARI TABLOSU (Koşu Sayısı K'ya göre)
    var NLI_SCHEDULE = {
        6: {
            1: { required: ["6G"] },
            2: { required: ["5G"] },
            3: { required: ["4G"] },
            4: { required: ["3G"] }
        },
        7: {
            1: { required: ["7P", "1. 3G"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            2: { required: ["6G"] },
            3: { required: ["5G"] },
            4: { required: ["4G"] },
            5: { required: ["2. 3G"] }
        },
        8: {
            1: { required: ["1. 6G"] },
            2: { required: ["7P", "1. 3G"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            3: { required: ["2. 6G"] },
            4: { required: ["5G"] },
            5: { required: ["4G"] },
            6: { required: ["2. 3G"] }
        },
        9: {
            1: { required: ["1. 6G"] },
            2: { required: ["1. 5G"] },
            3: { required: ["7P", "1. 3G"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            4: { required: ["2. 6G"] },
            5: { required: ["2. 5G"] },
            6: { required: ["4G"] },
            7: { required: ["2. 3G"] }
        },
        10: {
            1: { required: ["1. 6G"] },
            2: { required: ["1. 5G"] },
            3: { required: ["1. 4G"] },
            4: { required: ["7P", "1. 3G"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            5: { required: ["2. 6G"] },
            6: { required: ["2. 5G"] },
            7: { required: ["2. 4G"] },
            8: { required: ["2. 3G"] }
        }
    };

    // 2. TABELA VE BEŞLİ ALINMAYAN ÜLKELER (Selangor = Malezya dahil)
    var NO_TABELA_BESLI_KEYWORDS = [
        "ABD",
        "ŞİLİ",
        "MALEZYA",
        "SELANGOR",
        "AVUSTRALYA",
        "URUGUAY",
        "BREZİLYA",
        "ARJANTİN"
    ];

    var BET_LABELS = {
        "G": "Ganyan (G)",
        "P": "Plase (P)",
        "PI": "Plase İkili (PI)",
        "I": "İkili (I)",
        "Io": "Sıralı İkili (Io)",
        "U": "Üçlü Bahis (U)",
        "T": "Tabela Bahis (T)",
        "5B": "Sıralı 5'li Bahis (5B)",
        "Ç": "Çifte (Ç)",
        "6G": "6'lı Ganyan (6G)",
        "1. 6G": "1. 6'lı Ganyan (6G)",
        "2. 6G": "2. 6'lı Ganyan (6G)",
        "5G": "5'li Ganyan (5G)",
        "1. 5G": "1. 5'li Ganyan (5G)",
        "2. 5G": "2. 5'li Ganyan (5G)",
        "4G": "4'lü Ganyan (4G)",
        "1. 4G": "1. 4'lü Ganyan (4G)",
        "2. 4G": "2. 4'lü Ganyan (4G)",
        "3G": "3'lü Ganyan (3G)",
        "1. 3G": "1. 3'lü Ganyan (3G)",
        "2. 3G": "2. 3'lü Ganyan (3G)",
        "7G": "7'li Ganyan (7G)",
        "7P": "7'li Plase (7P)"
    };

    var autoHighlightActive = false;

    function formatBetName(code) {
        return BET_LABELS[code] || code;
    }

    function getCleanTabName(tabEl) {
        if (!tabEl) return "";
        if (!tabEl.dataset.tjkCleanName) {
            var clone = tabEl.cloneNode(true);
            clone.querySelectorAll('.tjk-tab-badge').forEach(function(b) { b.remove(); });
            tabEl.dataset.tjkCleanName = clone.innerText.trim();
        }
        return tabEl.dataset.tjkCleanName;
    }

    function createFloatingControls() {
        if (document.getElementById('tjk-qa-controls')) return;

        var today = new Date().toLocaleDateString('tr-TR');
        var wrapper = document.createElement('div');
        wrapper.id = 'tjk-qa-controls';
        wrapper.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            gap: 8px;
            align-items: center;
        `;

        var singleBtn = document.createElement('button');
        singleBtn.id = 'tjk-qa-single-btn';
        singleBtn.innerHTML = `🔍 Aktif Programı Kontrol Et`;
        singleBtn.style.cssText = `
            background-color: #1e7e34;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 15px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        singleBtn.onclick = function() {
            checkCurrentProgram(true);
        };

        var allBtn = document.createElement('button');
        allBtn.id = 'tjk-qa-all-btn';
        allBtn.innerHTML = `🚀 Tüm Programları Kontrol Et <span style="font-size:11px; opacity:0.85; display:block;">(${today})</span>`;
        allBtn.style.cssText = `
            background-color: #0056b3;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        allBtn.onclick = checkAllPrograms;

        wrapper.appendChild(singleBtn);
        wrapper.appendChild(allBtn);
        document.body.appendChild(wrapper);
    }

    function showBanner(message, isError) {
        var existing = document.getElementById('tjk-main-banner');
        if (existing) existing.remove();

        var banner = document.createElement('div');
        banner.id = 'tjk-main-banner';
        banner.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999999;
            padding: 14px 26px;
            font-size: 15px;
            font-weight: bold;
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            background-color: ${isError ? '#dc3545' : '#28a745'};
            text-align: center;
            max-width: 90%;
        `;
        banner.innerText = message;

        document.body.appendChild(banner);
        setTimeout(function() { banner.remove(); }, 6000);
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
            var nestedTable = prev.querySelector ? prev.querySelector('table') : null;
            if (nestedTable) return nestedTable;
            prev = prev.previousElementSibling;
        }
        return null;
    }

    function extractProgramData(rootDoc, tabEl, isLive) {
        var rawName = getCleanTabName(tabEl);
        var upperName = rawName.toLocaleUpperCase('tr-TR');
        var sehirId = tabEl ? parseInt(tabEl.getAttribute('data-sehir-id') || '0', 10) : 0;

        var isKarma = upperName.includes("KARMA") || sehirId === 17;
        var isForeign = !isKarma && (upperName.includes("(YD") || sehirId > 10);
        var isNoTabelaBesliCountry = !isKarma && NO_TABELA_BESLI_KEYWORDS.some(function(kw) {
            return upperName.includes(kw);
        });

        var pageData = {
            races: [],
            trackName: rawName,
            upperTrackName: upperName,
            sehirId: sehirId,
            isKarma: isKarma,
            isForeign: isForeign,
            isNoTabelaBesliCountry: isNoTabelaBesliCountry,
            has7G: false
        };

        var allContainers = Array.from(rootDoc.querySelectorAll('.bahisTipiGridContainer'));
        var betContainers = isLive
            ? allContainers.filter(function(el) { return el.offsetParent !== null; })
            : allContainers;

        var totalRacesCount = betContainers.length;

        betContainers.forEach(function(container, index) {
            var raceNo = index + 1;
            var betCards = container.querySelectorAll('.bahisTipiCard');

            var singleBets = [];
            var multiBets = [];

            betCards.forEach(function(card) {
                var text = card.innerText.replace(/\s+/g, ' ').trim().toLocaleUpperCase('tr-TR');

                // Sabit ihtimalli bahisler kontrol edilmez
                if (text.includes("SABİT")) return;

                var hasFirstPrefix = /(?:^|\s)1\s*\./.test(text);
                var hasSecondPrefix = /(?:^|\s)2\s*\./.test(text);

                // N'li Bahisler (kesme işareti ve boşluk farklarına duyarlı)
                var isMulti = false;
                if (/6['’\s]*L[Iİ]\s*GANYAN/.test(text)) {
                    isMulti = true;
                    if (hasFirstPrefix) multiBets.push("1. 6G");
                    else if (hasSecondPrefix) multiBets.push("2. 6G");
                    else multiBets.push("6G");
                }
                if (/5['’\s]*L[Iİ]\s*GANYAN/.test(text)) {
                    isMulti = true;
                    if (hasFirstPrefix) multiBets.push("1. 5G");
                    else if (hasSecondPrefix) multiBets.push("2. 5G");
                    else multiBets.push("5G");
                }
                if (/4['’\s]*L[UÜ]\s*GANYAN/.test(text)) {
                    isMulti = true;
                    if (hasFirstPrefix) multiBets.push("1. 4G");
                    else if (hasSecondPrefix) multiBets.push("2. 4G");
                    else multiBets.push("4G");
                }
                if (/3['’\s]*L[UÜ]\s*GANYAN/.test(text)) {
                    isMulti = true;
                    if (hasFirstPrefix) multiBets.push("1. 3G");
                    else if (hasSecondPrefix) multiBets.push("2. 3G");
                    else multiBets.push("3G");
                }
                if (/7['’\s]*L[Iİ]\s*GANYAN/.test(text)) {
                    isMulti = true;
                    multiBets.push("7G");
                    pageData.has7G = true;
                }
                if (/7['’\s]*L[Iİ]\s*PLASE/.test(text)) {
                    isMulti = true;
                    multiBets.push("7P");
                }

                if (isMulti) return;

                // Tekli Bahisler
                if (text.includes("PLASE İKİLİ")) {
                    if (!singleBets.includes("PI")) singleBets.push("PI");
                } else if (text.includes("PLASE")) {
                    if (!singleBets.includes("P")) singleBets.push("P");
                }

                if (text.includes("SIRALI İKİLİ")) {
                    if (!singleBets.includes("Io")) singleBets.push("Io");
                } else if (text.includes("İKİLİ") && !text.includes("PLASE İKİLİ")) {
                    if (!singleBets.includes("I")) singleBets.push("I");
                }

                if (text.includes("GANYAN")) {
                    if (!singleBets.includes("G")) singleBets.push("G");
                }

                if (text.includes("ÜÇLÜ") || /3['’\s]*L[UÜ]\s*BAH[İI]S/.test(text)) {
                    if (!singleBets.includes("U")) singleBets.push("U");
                }

                if (text.includes("TABELA")) {
                    if (!singleBets.includes("T")) singleBets.push("T");
                }

                // "SIRALI 5 Lİ BAHİS", "SIRALI 5'Lİ BAHİS" ve "BEŞLİ" varyasyonlarını yakalar
                if (text.includes("BEŞLİ") || /5['’\s]*L[İI]\s*BAH[İI]S/.test(text)) {
                    if (!singleBets.includes("5B")) singleBets.push("5B");
                }

                if (text.includes("ÇİFTE")) {
                    if (!singleBets.includes("Ç")) singleBets.push("Ç");
                }
            });

            var horseCount = 0;
            var scratchedCount = 0;
            var coupledCount = 0;
            var raceTable = findRaceTable(container);

            if (raceTable) {
                var horseNameCells = raceTable.querySelectorAll('.gunluk-GunlukYarisProgrami-AtAdi');
                var rows = horseNameCells.length > 0
                    ? Array.from(horseNameCells).map(function(td) { return td.closest('tr'); })
                    : Array.from(raceTable.querySelectorAll('tbody tr'));

                horseCount = rows.length;
                rows.forEach(function(tr) {
                    if (!tr) return;
                    var rowText = tr.innerText.toLocaleUpperCase('tr-TR');
                    if (rowText.includes("KOŞMAZ")) scratchedCount++;
                    if (rowText.includes("EKÜRİ") || tr.querySelector('[class*="ekuri" i]')) coupledCount++;
                });
            }

            pageData.races.push({
                raceNo: raceNo,
                horseCount: horseCount,
                scratchedCount: scratchedCount,
                coupledCount: coupledCount,
                totalRaces: totalRacesCount,
                singleBets: singleBets,
                multiBets: multiBets,
                domReference: isLive ? container : null
            });
        });

        return pageData;
    }

    function matchesMultiBet(actualList, expectedCode) {
        if (actualList.includes(expectedCode)) return true;
        if (!expectedCode.startsWith("1. ") && !expectedCode.startsWith("2. ")) {
            if (actualList.includes("1. " + expectedCode) || actualList.includes("2. " + expectedCode)) {
                return true;
            }
        }
        return false;
    }

    function isMultiBetAllowed(actualCode, allowedList) {
        if (allowedList.includes(actualCode)) return true;
        var baseCode = actualCode.replace(/^[12]\.\s*/, "");
        if (allowedList.includes(baseCode)) return true;
        return false;
    }

    function validateProgram(pageData) {
        var programErrors = [];
        var raceErrorsMap = {};
        var K = pageData.races.length;

        pageData.races.forEach(function(r) {
            raceErrorsMap[r.raceNo] = [];
        });

        function addError(raceNo, type, text) {
            raceErrorsMap[raceNo].push({ type: type, text: text });
        }

        if (K === 0) {
            programErrors.push("Program verisi boş veya henüz yüklenmemiş.");
            return { programErrors: programErrors, raceErrorsMap: raceErrorsMap, totalErrors: 1 };
        }

        // KURAL 9: KARMA PROGRAMI
        if (pageData.isKarma) {
            if (K !== 6) {
                programErrors.push(`Karma programı 6 koşu olmalı (Mevcut: ${K} koşu).`);
            }
            pageData.races.forEach(function(race) {
                if (race.raceNo === 1) {
                    if (!matchesMultiBet(race.multiBets, "6G")) {
                        addError(1, "EKSİK", "Karma programında 1. koşuda 6'lı Ganyan (6G) başlamalı.");
                    }
                } else {
                    if (matchesMultiBet(race.multiBets, "6G")) {
                        addError(race.raceNo, "FAZLA", "Karma programında 6'lı Ganyan yalnızca 1. koşuda başlamalı.");
                    }
                }
            });
            var karmaErrCount = programErrors.length + Object.values(raceErrorsMap).reduce(function(acc, arr) { return acc + arr.length; }, 0);
            return { programErrors: programErrors, raceErrorsMap: raceErrorsMap, totalErrors: karmaErrCount };
        }

        var scheduleForK = NLI_SCHEDULE[K];
        if (!scheduleForK) {
            programErrors.push(`Şablon tablosunda ${K} koşulu program tanımı bulunmuyor (6-10 koşu olmalı).`);
        }

        pageData.races.forEach(function(race) {
            var rNo = race.raceNo;
            var n = race.horseCount;
            var isLastRace = (rNo === K);

            // KURAL 6 & 8: N'Lİ BAHİSLERİN BAŞLANGIÇ KOŞULARI
            var expectedList = [];
            var optionalList = [];

            if (scheduleForK && scheduleForK[rNo]) {
                var slot = scheduleForK[rNo];
                if (slot.required) expectedList = expectedList.concat(slot.required);
                if (!pageData.isForeign && slot.domesticRequired) {
                    expectedList = expectedList.concat(slot.domesticRequired);
                }
                if (pageData.isForeign && slot.foreignOptional) {
                    optionalList = optionalList.concat(slot.foreignOptional);
                }
            }

            expectedList.forEach(function(expCode) {
                if (!matchesMultiBet(race.multiBets
