// ==UserScript==
// @name         TJK Program Kontrolcüsü
// @namespace    https://github.com/
// @version      3.0
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
            1: { required: ["7P"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            2: { required: ["6G"] },
            3: { required: ["5G"] },
            4: { required: ["4G"] },
            5: { required: ["3G"] }
        },
        8: {
            1: { required: ["1. 6G"] },
            2: { required: ["7P"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            3: { required: ["2. 6G"] },
            4: { required: ["5G"] },
            5: { required: ["4G"] },
            6: { required: ["3G"] }
        },
        9: {
            1: { required: ["1. 6G"] },
            2: { required: ["1. 5G"] },
            3: { required: ["7P"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            4: { required: ["2. 6G"] },
            5: { required: ["2. 5G"] },
            6: { required: ["4G"] },
            7: { required: ["3G"] }
        },
        10: {
            1: { required: ["1. 6G"] },
            2: { required: ["1. 5G"] },
            3: { required: ["1. 4G"] },
            4: { required: ["7P"], domesticRequired: ["7G"], foreignOptional: ["7G"] },
            5: { required: ["2. 6G"] },
            6: { required: ["2. 5G"] },
            7: { required: ["2. 4G"] },
            8: { required: ["3G"] }
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

    // Sağ alt köşeye Tekil ve Toplu Kontrol butonlarını ekle
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

    // Hem canlı DOM (document) hem de fetch ile gelen DOMParser dokümanı için ortak veri çıkarıcı
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
        // Canlı DOM'da daha önce açılıp gizlenmiş sekmelerin kutularını hariç tut
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
                var text = card.innerText.trim().toLocaleUpperCase('tr-TR');

                // Sabit ihtimalli bahisler kontrol edilmez
                if (text.includes("SABİT")) return;

                var isMulti = false;
                if (text.includes("6'LI GANYAN")) {
                    isMulti = true;
                    if (text.includes("1. 6'LI")) multiBets.push("1. 6G");
                    else if (text.includes("2. 6'LI")) multiBets.push("2. 6G");
                    else multiBets.push("6G");
                }
                if (text.includes("5'Lİ GANYAN")) {
                    isMulti = true;
                    if (text.includes("1. 5'Lİ")) multiBets.push("1. 5G");
                    else if (text.includes("2. 5'Lİ")) multiBets.push("2. 5G");
                    else multiBets.push("5G");
                }
                if (text.includes("4'LÜ GANYAN")) {
                    isMulti = true;
                    if (text.includes("1. 4'LÜ")) multiBets.push("1. 4G");
                    else if (text.includes("2. 4'LÜ")) multiBets.push("2. 4G");
                    else multiBets.push("4G");
                }
                if (text.includes("3'LÜ GANYAN")) {
                    isMulti = true;
                    if (text.includes("1. 3'LÜ")) multiBets.push("1. 3G");
                    else if (text.includes("2. 3'LÜ")) multiBets.push("2. 3G");
                    else multiBets.push("3G");
                }
                if (text.includes("7'Lİ GANYAN")) {
                    isMulti = true;
                    multiBets.push("7G");
                    pageData.has7G = true;
                }
                if (text.includes("7'Lİ PLASE")) {
                    isMulti = true;
                    multiBets.push("7P");
                }

                if (isMulti) return;

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

                if (text.includes("ÜÇLÜ")) {
                    if (!singleBets.includes("U")) singleBets.push("U");
                }

                if (text.includes("TABELA")) {
                    if (!singleBets.includes("T")) singleBets.push("T");
                }

                if (text.includes("BEŞLİ") || text.includes("5'Lİ BAHİS")) {
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
                if (!matchesMultiBet(race.multiBets, expCode)) {
                    addError(rNo, "EKSİK", `${formatBetName(expCode)} bu koşuda başlamalı.`);
                }
            });

            var allAllowedMulti = expectedList.concat(optionalList);
            race.multiBets.forEach(function(actCode) {
                if (!isMultiBetAllowed(actCode, allAllowedMulti)) {
                    addError(rNo, "FAZLA", `${formatBetName(actCode)} bu koşuda başlamamalı.`);
                }
            });

            // KURAL 7: ÇİFTE
            var hasCifte = race.singleBets.includes("Ç");
            if (!isLastRace && !hasCifte) {
                addError(rNo, "EKSİK", "Çifte (Ç) başlamalı (Son koşu hariç her koşuda olur).");
            }
            if (isLastRace && hasCifte) {
                addError(rNo, "FAZLA", "Son koşuda Çifte (Ç) başlamaz.");
            }

            // KURAL 4: 6'LI GANYAN BAŞLANGIÇ KOŞUSU İSTİSNASI
            var is6GStart = race.multiBets.some(function(m) {
                return m === "6G" || m === "1. 6G" || m === "2. 6G";
            });

            if (!race.singleBets.includes("G")) {
                addError(rNo, "EKSİK", "Ganyan (G) her koşuda olmalı.");
            }

            if (n >= 4 && !race.singleBets.includes("Io")) {
                addError(rNo, "EKSİK", `Sıralı İkili (Io) olmalı (4 at ve üzeri, mevcut: ${n}).`);
            } else if (n < 4 && race.singleBets.includes("Io")) {
                addError(rNo, "FAZLA", `Sıralı İkili (Io) olmamalı (4 attan az, mevcut: ${n}).`);
            }

            if (n >= 7 && !race.singleBets.includes("I")) {
                addError(rNo, "EKSİK", `İkili (I) olmalı (7 at ve üzeri, mevcut: ${n}).`);
            } else if (n < 7 && race.singleBets.includes("I")) {
                addError(rNo, "FAZLA", `İkili (I) olmamalı (7 attan az, mevcut: ${n}).`);
            }

            if (is6GStart) {
                ["P", "PI", "U", "T", "5B"].forEach(function(forbiddenCode) {
                    if (race.singleBets.includes(forbiddenCode)) {
                        addError(rNo, "FAZLA", `6'lı Ganyan başlangıç koşusunda ${formatBetName(forbiddenCode)} olmaz.`);
                    }
                });
                return;
            }

            // KURAL 3 & 5: TEK KOŞU BAHİSLERİ
            if (n >= 8 && !race.singleBets.includes("P")) {
                addError(rNo, "EKSİK", `Plase (P) olmalı (8 at ve üzeri, mevcut: ${n}).`);
            } else if (n < 8 && race.singleBets.includes("P")) {
                addError(rNo, "FAZLA", `Plase (P) olmamalı (8 attan az, mevcut: ${n}).`);
            }

            if (n >= 10 && !race.singleBets.includes("PI")) {
                addError(rNo, "EKSİK", `Plase İkili (PI) olmalı (10 at ve üzeri, mevcut: ${n}).`);
            } else if (n < 10 && race.singleBets.includes("PI")) {
                addError(rNo, "FAZLA", `Plase İkili (PI) olmamalı (10 attan az, mevcut: ${n}).`);
            }

            var hasU = race.singleBets.includes("U");
            var hasT = race.singleBets.includes("T");
            var has5B = race.singleBets.includes("5B");

            if (pageData.isNoTabelaBesliCountry) {
                if (hasT) addError(rNo, "FAZLA", "Bu ülkede Tabela Bahis (T) alınmaz.");
                if (has5B) addError(rNo, "FAZLA", "Bu ülkede Sıralı 5'li Bahis (5B) alınmaz.");

                if (n >= 7 && !hasU) {
                    addError(rNo, "EKSİK", `Üçlü Bahis (U) olmalı (Bu ülkede 7 at ve üzeri tüm koşularda olur, mevcut: ${n}).`);
                } else if (n < 7 && hasU) {
                    addError(rNo, "FAZLA", `Üçlü Bahis (U) olmamalı (7 attan az, mevcut: ${n}).`);
                }
            } else {
                if (n >= 12 && !has5B) {
                    addError(rNo, "EKSİK", `Sıralı 5'li Bahis (5B) olmalı (12 at ve üzeri, mevcut: ${n}).`);
                } else if (n < 12 && has5B) {
                    addError(rNo, "FAZLA", `Sıralı 5'li Bahis (5B) olmamalı (12 attan az, mevcut: ${n}).`);
                }

                if (n < 7) {
                    if (hasU) addError(rNo, "FAZLA", `Üçlü Bahis (U) olmamalı (7 attan az, mevcut: ${n}).`);
                    if (hasT) addError(rNo, "FAZLA", `Tabela Bahis (T) olmamalı (12 attan az, mevcut: ${n}).`);
                } else if (n >= 7 && n <= 11) {
                    if (!hasU) addError(rNo, "EKSİK", `Üçlü Bahis (U) olmalı (7-11 at arası, mevcut: ${n}).`);
                    if (hasT) addError(rNo, "FAZLA", `Tabela Bahis (T) olmamalı (12 attan az, mevcut: ${n}).`);
                } else if (n >= 12 && n <= 13) {
                    if (hasU && hasT) {
                        addError(rNo, "FAZLA", `12-13 atta Üçlü (U) ve Tabela (T) ikisi birden olmaz (birbirini dışlar, mevcut: ${n}).`);
                    } else if (!hasU && !hasT) {
                        addError(rNo, "EKSİK", `12-13 atta Üçlü (U) veya Tabela (T) bahislerinden biri olmalı (mevcut: ${n}).`);
                    }
                } else if (n >= 14) {
                    if (!hasT) addError(rNo, "EKSİK", `Tabela Bahis (T) olmalı (14 at ve üzeri, mevcut: ${n}).`);
                    if (hasU) addError(rNo, "FAZLA", `Üçlü Bahis (U) olmamalı (14 at ve üzeri koşuda Tabela olur, mevcut: ${n}).`);
                }
            }
        });

        var totalErrors = programErrors.length + Object.values(raceErrorsMap).reduce(function(acc, arr) {
            return acc + arr.length;
        }, 0);

        return {
            programErrors: programErrors,
            raceErrorsMap: raceErrorsMap,
            totalErrors: totalErrors
        };
    }

    // Ekrandaki görünür koşulara yeşil/kırmızı kutuları çizer
    function renderHighlightsOnActiveDOM(pageData, result) {
        document.querySelectorAll('.tjk-validation-box').forEach(function(e) { e.remove(); });

        if (!pageData || pageData.races.length === 0) return;

        if (result.programErrors.length > 0 && pageData.races[0].domReference) {
            var firstContainer = pageData.races[0].domReference;
            var progWarn = document.createElement("div");
            progWarn.className = "tjk-validation-box";
            progWarn.style.cssText = "background:#8b0000; color:white; padding:12px; font-weight:bold; font-size:14px; margin-bottom:10px; border-radius:5px;";
            progWarn.innerText = "🚨 PROGRAM HATASI: " + result.programErrors.join(" | ");
            firstContainer.parentElement.insertBefore(progWarn, firstContainer);
        }

        pageData.races.forEach(function(race) {
            var targetDOM = race.domReference;
            if (!targetDOM) return;

            var errors = result.raceErrorsMap[race.raceNo] || [];

            var notes = [`At Sayısı (n): ${race.horseCount}`];
            if (race.scratchedCount > 0) notes.push(`Koşmaz: ${race.scratchedCount} (sayıdan düşülmedi)`);
            if (race.coupledCount > 0) notes.push(`Eküri satırı: ${race.coupledCount}`);
            if (pageData.isKarma) notes.push("Karma Modu");
            var noteStr = notes.join(" | ");

            if (errors.length > 0) {
                targetDOM.style.border = "4px solid #dc3545";
                targetDOM.style.borderRadius = "5px";

                var box = document.createElement("div");
                box.className = "tjk-validation-box";
                box.style.cssText = "background:#dc3545; color:white; padding:10px 14px; font-size:13px; margin-bottom:8px; border-radius:5px; line-height:1.5;";

                var headerHtml = `<div style="font-weight:bold; font-size:14px; margin-bottom:4px;">⚠️ ${race.raceNo}. KOŞU — ${errors.length} HATA <span style="font-weight:normal; font-size:12px; opacity:0.9;">(${noteStr})</span></div>`;
                var itemsHtml = errors.map(function(err) {
                    var badgeColor = err.type === "EKSİK" ? "#ffc107; color:#000" : "#343a40; color:#fff";
                    return `<div>• <span style="background:${badgeColor}; padding:1px 6px; border-radius:3px; font-weight:bold; font-size:11px;">${err.type}</span> ${err.text}</div>`;
                }).join("");

                box.innerHTML = headerHtml + itemsHtml;
                targetDOM.parentElement.insertBefore(box, targetDOM);
            } else {
                targetDOM.style.border = "4px solid #28a745";
                targetDOM.style.borderRadius = "5px";

                var successDiv = document.createElement("div");
                successDiv.className = "tjk-validation-box";
                successDiv.style.cssText = "background:#28a745; color:white; padding:9px 14px; font-weight:bold; font-size:13px; margin-bottom:8px; border-radius:5px;";
                successDiv.innerHTML = `✅ ${race.raceNo}. KOŞU: Tüm kurallar uygun. <span style="font-weight:normal; font-size:12px; opacity:0.9;">(${noteStr})</span>`;
                targetDOM.parentElement.insertBefore(successDiv, targetDOM);
            }
        });
    }

    function setTabBadge(tabEl, errorCount) {
        if (!tabEl) return;
        getCleanTabName(tabEl);
        tabEl.querySelectorAll('.tjk-tab-badge').forEach(function(b) { b.remove(); });

        var badge = document.createElement('span');
        badge.className = 'tjk-tab-badge';
        if (errorCount > 0) {
            badge.style.cssText = "background:#dc3545; color:#fff; padding:1px 5px; border-radius:3px; font-size:11px; margin-left:4px; font-weight:bold;";
            badge.innerText = `⚠️ ${errorCount}`;
        } else {
            badge.style.cssText = "background:#28a745; color:#fff; padding:1px 5px; border-radius:3px; font-size:11px; margin-left:4px; font-weight:bold;";
            badge.innerText = `✅`;
        }
        tabEl.appendChild(badge);
    }

    // Tekil kontrol (sadece aktif açık sekme)
    function checkCurrentProgram(withBanner) {
        var activeTab = document.querySelector('ul.gunluk-tabs li a.current');
        var pageData = extractProgramData(document, activeTab, true);

        if (pageData.races.length === 0) {
            if (withBanner) showBanner("HATA: Sayfada yarış bulunamadı. Programın yüklendiğinden emin olun.", true);
            return null;
        }

        var result = validateProgram(pageData);
        renderHighlightsOnActiveDOM(pageData, result);
        if (activeTab) setTabBadge(activeTab, result.totalErrors);

        if (withBanner) {
            if (result.totalErrors > 0) {
                showBanner(`${pageData.trackName}: Toplam ${result.totalErrors} EKSİK/FAZLA bulundu!`, true);
            } else {
                showBanner(`${pageData.trackName}: Program tamamen kurallara uygun!`, false);
            }
        }
        return { pageData: pageData, result: result };
    }

    // Toplu Kontrol Rapor Paneli
    function renderSummaryModal(allReports, foreign7GPrograms, eligibleForeignCount) {
        var existing = document.getElementById('tjk-batch-summary-panel');
        if (existing) existing.remove();

        var totalAllErrors = allReports.reduce(function(sum, item) {
            return sum + item.result.totalErrors;
        }, 0);

        // Kural 8: Günlük yurt dışı 7'li Ganyan kontrolü (yalnızca 2 yurt dışı programda olmalı)
        var foreign7GWarningHtml = "";
        if (eligibleForeignCount >= 2 && foreign7GPrograms.length !== 2) {
            totalAllErrors++;
            foreign7GWarningHtml = `
                <div style="background:#fff3cd; color:#856404; border:1px solid #ffeeba; padding:10px 12px; border-radius:6px; margin-bottom:12px; font-size:13px;">
                    ⚠️ <b>Yurt Dışı 7'li Ganyan Kuralı:</b> O gün seçilen yalnızca <b>2</b> yurt dışı programda 7'li Ganyan olmalı.
                    (Bulunan: <b>${foreign7GPrograms.length}</b> program${foreign7GPrograms.length > 0 ? " → " + foreign7GPrograms.join(", ") : ""})
                </div>
            `;
        } else if (eligibleForeignCount > 0) {
            foreign7GWarningHtml = `
                <div style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:12px;">
                    ✅ <b>Yurt Dışı 7'li Ganyan Kuralı Uygun:</b> ${foreign7GPrograms.length} programda 7G aktif (${foreign7GPrograms.join(", ") || "Yok"}).
                </div>
            `;
        }

        var panel = document.createElement('div');
        panel.id = 'tjk-batch-summary-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 460px;
            max-width: 92vw;
            max-height: 82vh;
            overflow-y: auto;
            background: #ffffff;
            color: #212529;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
            z-index: 9999998;
            font-family: Arial, sans-serif;
            border: 2px solid ${totalAllErrors > 0 ? '#dc3545' : '#28a745'};
        `;

        var headerBg = totalAllErrors > 0 ? '#dc3545' : '#28a745';
        var headerTitle = totalAllErrors > 0
            ? `⚠️ Toplu Kontrol Tamamlandı (${totalAllErrors} Hata)`
            : `✅ Tüm Programlar Kurallara Uygun!`;

        var cardsHtml = allReports.map(function(item, idx) {
            var pd = item.pageData;
            var res = item.result;
            var hasErr = res.totalErrors > 0;
            var modeTag = pd.isKarma ? "Karma" : (pd.isNoTabelaBesliCountry ? "YD - T/5B Yok" : (pd.isForeign ? "Yurt Dışı" : "Yerli"));

            var detailHtml = "";
            if (hasErr) {
                var lines = [];
                res.programErrors.forEach(function(pe) {
                    lines.push(`<div style="color:#8b0000; font-weight:bold;">🚨 ${pe}</div>`);
                });
                Object.keys(res.raceErrorsMap).forEach(function(rNo) {
                    res.raceErrorsMap[rNo].forEach(function(err) {
                        var badgeBg = err.type === "EKSİK" ? "#ffc107; color:#000" : "#343a40; color:#fff";
                        lines.push(`<div><b>${rNo}. Koşu:</b> <span style="background:${badgeBg}; padding:1px 5px; border-radius:3px; font-size:10px; font-weight:bold;">${err.type}</span> ${err.text}</div>`);
                    });
                });
                detailHtml = `<div style="margin-top:8px; padding-top:8px; border-top:1px solid #f5c6cb; font-size:12px; line-height:1.45;">${lines.join("")}</div>`;
            }

            return `
                <div class="tjk-summary-item" data-tab-index="${idx}" style="
                    background: ${hasErr ? '#fff5f5' : '#f4fbf6'};
                    border: 1px solid ${hasErr ? '#f5c6cb' : '#c3e6cb'};
                    border-left: 5px solid ${hasErr ? '#dc3545' : '#28a745'};
                    border-radius: 6px;
                    padding: 10px 12px;
                    margin-bottom: 8px;
                    cursor: pointer;
                " title="Bu hipodroma gitmek için tıklayın">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span style="font-weight:bold; font-size:13px;">${hasErr ? '⚠️' : '✅'} ${pd.trackName}</span>
                            <span style="font-size:11px; color:#666; margin-left:6px;">(${modeTag} • ${pd.races.length} Koşu)</span>
                        </div>
                        <span style="font-size:11px; font-weight:bold; color:${hasErr ? '#dc3545' : '#28a745'};">
                            ${hasErr ? res.totalErrors + ' Hata' : 'Uygun'}
                        </span>
                    </div>
                    ${detailHtml}
                </div>
            `;
        }).join("");

        panel.innerHTML = `
            <div style="background:${headerBg}; color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:2;">
                <span style="font-weight:bold; font-size:14px;">${headerTitle}</span>
                <button id="tjk-close-summary-btn" style="background:rgba(255,255,255,0.2); border:none; color:white; font-weight:bold; font-size:14px; border-radius:4px; padding:2px 8px; cursor:pointer;">✕</button>
            </div>
            <div style="padding:12px 14px;">
                <div style="font-size:11px; color:#666; margin-bottom:10px;">
                    İncelemek istediğiniz hipodromun üzerine tıklayarak ilgili sekmeye geçebilirsiniz.
                </div>
                ${foreign7GWarningHtml}
                ${cardsHtml}
            </div>
        `;

        document.body.appendChild(panel);

        document.getElementById('tjk-close-summary-btn').onclick = function() {
            panel.remove();
        };

        var tabLinks = Array.from(document.querySelectorAll('ul.gunluk-tabs li a'));
        panel.querySelectorAll('.tjk-summary-item').forEach(function(cardEl) {
            cardEl.onclick = function() {
                var idx = parseInt(cardEl.getAttribute('data-tab-index'), 10);
                if (tabLinks[idx]) {
                    tabLinks[idx].click();
                    setTimeout(function() { checkCurrentProgram(false); }, 600);
                }
            };
        });
    }

    // Sekme değiştirildiğinde otomatik olarak yeşil/kırmızı kutuları çiz
    function enableAutoHighlightOnTabSwitch() {
        if (autoHighlightActive) return;
        autoHighlightActive = true;

        var panesContainer = document.querySelector('div.gunluk-panes');
        if (!panesContainer) return;

        var debounceTimer = null;
        var observer = new MutationObserver(function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
                checkCurrentProgram(false);
            }, 400);
        });

        observer.observe(panesContainer, { childList: true, subtree: true, attributes: true });
    }

    // TÜM PROGRAMLARI TEK SEFERDE KONTROL ET
    async function checkAllPrograms() {
        var tabLinks = Array.from(document.querySelectorAll('ul.gunluk-tabs li a'));

        if (tabLinks.length === 0) {
            showBanner("HATA: Sayfada hipodrom sekmeleri bulunamadı.", true);
            return;
        }

        var allBtn = document.getElementById('tjk-qa-all-btn');
        var originalBtnHtml = allBtn ? allBtn.innerHTML : "";
        if (allBtn) {
            allBtn.disabled = true;
            allBtn.innerHTML = `⏳ Tüm Programlar Taranıyor (${tabLinks.length} Hipodrom)...`;
        }

        try {
            var parser = new DOMParser();

            var fetchPromises = tabLinks.map(async function(tabEl) {
                var isCurrent = tabEl.classList.contains('current');
                if (isCurrent) {
                    var liveData = extractProgramData(document, tabEl, true);
                    var liveRes = validateProgram(liveData);
                    renderHighlightsOnActiveDOM(liveData, liveRes);
                    setTabBadge(tabEl, liveRes.totalErrors);
                    return { pageData: liveData, result: liveRes };
                }

                var url = tabEl.href;
                var response = await fetch(url, { credentials: 'same-origin' });
                var htmlText = await response.text();
                var parsedDoc = parser.parseFromString(htmlText, 'text/html');

                var fetchedData = extractProgramData(parsedDoc, tabEl, false);
                var fetchedRes = validateProgram(fetchedData);
                setTabBadge(tabEl, fetchedRes.totalErrors);

                return { pageData: fetchedData, result: fetchedRes };
            });

            var allReports = await Promise.all(fetchPromises);

            var foreign7GPrograms = [];
            var eligibleForeignCount = 0;

            allReports.forEach(function(rep) {
                if (rep.pageData.isForeign) {
                    if (rep.pageData.races.length >= 7) {
                        eligibleForeignCount++;
                    }
                    if (rep.pageData.has7G) {
                        foreign7GPrograms.push(rep.pageData.trackName);
                    }
                }
            });

            renderSummaryModal(allReports, foreign7GPrograms, eligibleForeignCount);
            enableAutoHighlightOnTabSwitch();

            var totalErrors = allReports.reduce(function(sum, r) { return sum + r.result.totalErrors; }, 0);
            showBanner(
                `Toplu kontrol tamamlandı! ${allReports.length} program tarandı (${totalErrors} hata bulundu).`,
                totalErrors > 0
            );
        } catch (err) {
            showBanner("Toplu kontrol sırasında ağ hatası oluştu: " + err.message, true);
        } finally {
            if (allBtn) {
                allBtn.disabled = false;
                allBtn.innerHTML = originalBtnHtml;
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingControls);
    } else {
        createFloatingControls();
    }
})();
