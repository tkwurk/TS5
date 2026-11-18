# UI Lint Report

_Generated 2026-11-18T05:41:07.908Z by tools/ui-lint.js (rule-based, no AI). Fix the items below._

## Summary

- Errors: **0** | Warnings: **0** | Info: **2523**
- Files scanned: 42

| File | Errors | Warnings | Info |
|---|---|---|---|
| index.html |  |  | 130 |
| test_tab_permissions.html |  |  | 7 |
| ui_PNL.html |  |  | 56 |
| ui_accessControl.html |  |  | 1 |
| ui_adminOrders.html |  |  | 418 |
| ui_adminOrders_style.html |  |  | 2 |
| ui_agentConsole.html |  |  | 8 |
| ui_attendance.html |  |  | 85 |
| ui_checklist.html |  |  | 168 |
| ui_checkout.html |  |  | 72 |
| ui_core.html |  |  | 1 |
| ui_deposits.html |  |  | 207 |
| ui_editData.html |  |  | 7 |
| ui_i18n.html |  |  | 1 |
| ui_index.html |  |  | 137 |
| ui_index_fixed.html |  |  | 60 |
| ui_inventoryConsumption.html |  |  | 66 |
| ui_kitchenCooking.html |  |  | 127 |
| ui_monthlySalesReport.html |  |  | 25 |
| ui_navigation.html |  |  | 103 |
| ui_orders.html |  |  | 272 |
| ui_performance_monitor.html |  |  | 9 |
| ui_purchasing.html |  |  | 80 |
| ui_purchasingLocal.html |  |  | 134 |
| ui_showInvestmentReport.html |  |  | 42 |
| ui_showSalesSummary.html |  |  | 35 |
| ui_splitPayment.html |  |  | 52 |
| ui_style.css.html |  |  | 6 |
| ui_tutorials.html |  |  | 19 |
| ui_usageReport.html |  |  | 182 |
| ui_utils.html |  |  | 11 |

## index.html

### [INFO] button-type (20)
Add type="button" to avoid accidental form submits.

- line 49
- line 50
- line 51
- line 285
- line 294
- line 295
- line 320
- line 345
- ...+12 more

### [INFO] img-lazy (2)
Add loading="lazy" for below-the-fold images.

- line 341
- line 397

### [INFO] responsive-width (7)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 492 - `style="margin:0 auto;max-width:350px`
- line 493 - `style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;marg`
- line 803 - `style="width:110px`
- line 804 - `style="width:160px`
- line 833 - `style="max-width:400px`
- line 887 - `style="max-width:400px`
- line 888 - `style="max-width:400px`

### [INFO] contrast (7)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 14 - `color: #fff`
- line 15 - `color: #fff`
- line 26 - `color:#fff`
- line 30 - `color: #fff`
- line 31 - `color:#fff`
- line 590 - `color:#fff`
- line 591 - `color:#fff`

### [INFO] inline-style (94)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 94 occurrence(s). First lines: 53, 283, 284, 293, 344, 345, 346, 347, +86 more

## test_tab_permissions.html

### [INFO] button-type (7)
Add type="button" to avoid accidental form submits.

- line 28
- line 29
- line 30
- line 31
- line 36
- line 37
- line 38

## ui_PNL.html

### [INFO] button-type (5)
Add type="button" to avoid accidental form submits.

- line 308
- line 309
- line 310
- line 311
- line 315

### [INFO] inline-style (51)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 51 occurrence(s). First lines: 315, 317, 488, 489, 490, 495, 496, 497, +43 more

## ui_accessControl.html

### [INFO] inline-style (1)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 1 occurrence(s). First lines: 147

## ui_adminOrders.html

### [INFO] button-type (59)
Add type="button" to avoid accidental form submits.

- line 238
- line 241
- line 244
- line 247
- line 250
- line 253
- line 256
- line 259
- ...+51 more

### [INFO] responsive-width (12)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 486 - `style="flex:1;min-width:160px`
- line 490 - `style="width:140px`
- line 586 - `style="width:120px`
- line 609 - `style="min-width:200px;flex:1;max-width:320px`
- line 747 - `style="padding:6px 10px;border-radius:4px;border:1px solid #ccc;width:160px`
- line 763 - `style="padding:6px 10px;border-radius:4px;border:1px solid #ccc;min-width:180px`
- line 775 - `style="padding:6px 10px;border-radius:4px;border:1px solid #ccc;width:100px`
- line 1554 - `style="background:#fff;border-radius:10px;padding:28px 32px;max-width:420px`
- ...+4 more

### [INFO] contrast (46)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 69 - `color: #fff`
- line 138 - `color: #fff`
- line 169 - `color: #fff`
- line 170 - `color: #fff`
- line 171 - `color: #fff`
- line 195 - `color: #fff`
- line 366 - `color:#fff`
- line 367 - `color:#fff`
- ...+38 more

### [INFO] inline-style (301)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 301 occurrence(s). First lines: 302, 317, 332, 349, 352, 356, 361, 364, +293 more

## ui_adminOrders_style.html

### [INFO] contrast (2)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 14 - `color: #fff`
- line 36 - `color: #fff`

## ui_agentConsole.html

### [INFO] button-type (3)
Add type="button" to avoid accidental form submits.

- line 51
- line 52
- line 55

### [INFO] contrast (2)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 23 - `color:#fff`
- line 30 - `color:#fff`

### [INFO] inline-style (3)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 3 occurrence(s). First lines: 54, 137, 148

## ui_attendance.html

### [INFO] button-type (8)
Add type="button" to avoid accidental form submits.

- line 37
- line 41
- line 45
- line 98
- line 115
- line 314
- line 399
- line 468

### [INFO] responsive-width (2)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 177 - `style="padding:8px;border:2px solid #ddd;border-radius:8px;font-size:1em;width:1`
- line 380 - `style="padding:8px;border:2px solid #ddd;border-radius:8px;font-size:1em;width:1`

### [INFO] inline-style (75)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 75 occurrence(s). First lines: 51, 52, 53, 88, 93, 94, 97, 99, +67 more

## ui_checklist.html

### [INFO] button-type (12)
Add type="button" to avoid accidental form submits.

- line 109
- line 111
- line 113
- line 115
- line 454
- line 492
- line 528
- line 582
- ...+4 more

### [INFO] contrast (7)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 31 - `color:#fff`
- line 32 - `color:#fff`
- line 115 - `color:#fff`
- line 446 - `color:#fff`
- line 556 - `color:#fff`
- line 609 - `color:#fff`
- line 791 - `color:#fff`

### [INFO] inline-style (149)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 149 occurrence(s). First lines: 114, 115, 128, 154, 174, 217, 221, 225, +141 more

## ui_checkout.html

### [INFO] button-type (7)
Add type="button" to avoid accidental form submits.

- line 264
- line 271
- line 559
- line 565
- line 607
- line 708
- line 715

### [INFO] responsive-width (2)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 233 - `style="width: 80%; max-width: 300px`
- line 578 - `style="width:60%;max-width:240px`

### [INFO] inline-style (63)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 63 occurrence(s). First lines: 199, 203, 212, 213, 216, 217, 218, 223, +55 more

## ui_core.html

### [INFO] button-type (1)
Add type="button" to avoid accidental form submits.

- line 3

## ui_deposits.html

### [INFO] button-type (15)
Add type="button" to avoid accidental form submits.

- line 234
- line 239
- line 244
- line 269
- line 273
- line 277
- line 355
- line 359
- ...+7 more

### [INFO] contrast (2)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 1373 - `color:#fff`
- line 1376 - `color:#fff`

### [INFO] inline-style (190)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 190 occurrence(s). First lines: 252, 286, 289, 291, 292, 294, 295, 296, +182 more

## ui_editData.html

### [INFO] button-type (3)
Add type="button" to avoid accidental form submits.

- line 62
- line 134
- line 156

### [INFO] responsive-width (1)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 133 - `style="width: 300px`

### [INFO] inline-style (3)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 3 occurrence(s). First lines: 132, 133, 149

## ui_i18n.html

### [INFO] inline-style (1)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 1 occurrence(s). First lines: 7

## ui_index.html

### [INFO] button-type (22)
Add type="button" to avoid accidental form submits.

- line 91
- line 99
- line 102
- line 105
- line 108
- line 111
- line 114
- line 117
- ...+14 more

### [INFO] responsive-width (2)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 218 - `style="max-width:800px`
- line 307 - `style="max-width:800px`

### [INFO] inline-style (113)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 113 occurrence(s). First lines: 69, 81, 82, 88, 95, 96, 99, 102, +105 more

## ui_index_fixed.html

### [INFO] button-type (12)
Add type="button" to avoid accidental form submits.

- line 62
- line 65
- line 68
- line 71
- line 74
- line 77
- line 80
- line 83
- ...+4 more

### [INFO] responsive-width (1)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 157 - `style="max-width:800px`

### [INFO] inline-style (47)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 47 occurrence(s). First lines: 39, 51, 52, 58, 89, 116, 137, 157, +39 more

## ui_inventoryConsumption.html

### [INFO] button-type (12)
Add type="button" to avoid accidental form submits.

- line 844
- line 845
- line 856
- line 875
- line 883
- line 891
- line 1153
- line 1154
- ...+4 more

### [INFO] responsive-width (8)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 951 - `style="width:100%;max-width:360px`
- line 963 - `style="width:120px`
- line 965 - `style="width:110px`
- line 966 - `style="width:120px`
- line 968 - `style="width:120px`
- line 969 - `style="width:120px`
- line 970 - `style="width:120px`
- line 971 - `style="width:120px`

### [INFO] inline-style (46)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 46 occurrence(s). First lines: 698, 846, 847, 851, 852, 875, 883, 910, +38 more

## ui_kitchenCooking.html

### [INFO] button-type (5)
Add type="button" to avoid accidental form submits.

- line 48
- line 49
- line 50
- line 51
- line 487

### [INFO] responsive-width (1)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 403 - `style="min-width:220px`

### [INFO] contrast (4)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 112 - `color:#fff`
- line 196 - `color:#fff`
- line 465 - `color:#fff`
- line 774 - `color:#fff`

### [INFO] inline-style (117)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 117 occurrence(s). First lines: 23, 40, 45, 46, 47, 48, 49, 50, +109 more

## ui_monthlySalesReport.html

### [INFO] button-type (16)
Add type="button" to avoid accidental form submits.

- line 47
- line 50
- line 53
- line 54
- line 61
- line 62
- line 63
- line 64
- ...+8 more

### [INFO] inline-style (9)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 9 occurrence(s). First lines: 59, 76, 83, 88, 92, 96, 99, 107, +1 more

## ui_navigation.html

### [INFO] button-type (14)
Add type="button" to avoid accidental form submits.

- line 682
- line 683
- line 691
- line 692
- line 694
- line 1330
- line 1331
- line 1339
- ...+6 more

### [INFO] responsive-width (3)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 671 - `style="padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13p`
- line 700 - `style="width:100%;max-width:360px`
- line 1100 - `style="
            width: 200px`

### [INFO] contrast (8)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 66 - `color: #fff`
- line 173 - `color: #fff`
- line 185 - `color: #fff`
- line 190 - `color: #fff`
- line 227 - `color: #fff`
- line 236 - `color: #fff`
- line 258 - `color: #fff`
- line 358 - `color: #fff`

### [INFO] inline-style (78)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 78 occurrence(s). First lines: 624, 624, 627, 636, 666, 667, 668, 669, +70 more

## ui_orders.html

### [INFO] button-type (48)
Add type="button" to avoid accidental form submits.

- line 887
- line 888
- line 1179
- line 1218
- line 1221
- line 1222
- line 1223
- line 1224
- ...+40 more

### [INFO] img-lazy (5)
Add loading="lazy" for below-the-fold images.

- line 2470
- line 2574
- line 2708
- line 2784
- line 4378

### [INFO] responsive-width (3)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 1558 - `style="flex:1;min-width:130px`
- line 4512 - `style="margin:0 auto;max-width:450px`
- line 4513 - `style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:12px;marg`

### [INFO] contrast (9)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 241 - `color: #fff`
- line 381 - `color: #fff`
- line 407 - `color: #fff`
- line 418 - `color: #fff`
- line 465 - `color: #fff`
- line 1420 - `color:#fff`
- line 2715 - `color:#fff`
- line 4618 - `color:#fff`
- ...+1 more

### [INFO] inline-style (207)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 207 occurrence(s). First lines: 878, 881, 882, 883, 884, 886, 887, 888, +199 more

## ui_performance_monitor.html

### [INFO] button-type (6)
Add type="button" to avoid accidental form submits.

- line 74
- line 75
- line 76
- line 96
- line 97
- line 98

### [INFO] inline-style (3)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 3 occurrence(s). First lines: 73, 140, 141

## ui_purchasing.html

### [INFO] button-type (15)
Add type="button" to avoid accidental form submits.

- line 74
- line 78
- line 92
- line 100
- line 209
- line 221
- line 340
- line 761
- ...+7 more

### [INFO] responsive-width (1)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 979 - `style="width:120px`

### [INFO] inline-style (64)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 64 occurrence(s). First lines: 83, 100, 106, 151, 152, 155, 166, 176, +56 more

## ui_purchasingLocal.html

### [INFO] button-type (19)
Add type="button" to avoid accidental form submits.

- line 25
- line 29
- line 46
- line 61
- line 468
- line 475
- line 481
- line 488
- ...+11 more

### [INFO] img-lazy (1)
Add loading="lazy" for below-the-fold images.

- line 1500

### [INFO] responsive-width (2)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 459 - `style="width:100px`
- line 729 - `style="width:120px`

### [INFO] inline-style (112)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 112 occurrence(s). First lines: 34, 35, 56, 61, 67, 427, 428, 430, +104 more

## ui_showInvestmentReport.html

### [INFO] button-type (8)
Add type="button" to avoid accidental form submits.

- line 36
- line 40
- line 105
- line 236
- line 253
- line 394
- line 398
- line 437

### [INFO] responsive-width (1)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 85 - `style="max-width:520px`

### [INFO] contrast (1)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 446 - `color:#fff`

### [INFO] inline-style (32)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 32 occurrence(s). First lines: 85, 86, 87, 89, 92, 95, 97, 100, +24 more

## ui_showSalesSummary.html

### [INFO] button-type (8)
Add type="button" to avoid accidental form submits.

- line 700
- line 704
- line 711
- line 712
- line 1379
- line 1380
- line 1381
- line 1613

### [INFO] responsive-width (1)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 1607 - `style="max-width:600px`

### [INFO] inline-style (26)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 26 occurrence(s). First lines: 704, 970, 1083, 1098, 1226, 1227, 1240, 1241, +18 more

## ui_splitPayment.html

### [INFO] button-type (4)
Add type="button" to avoid accidental form submits.

- line 76
- line 77
- line 225
- line 226

### [INFO] responsive-width (1)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 220 - `style="width:80%;max-width:300px`

### [INFO] inline-style (47)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 47 occurrence(s). First lines: 53, 55, 57, 57, 59, 59, 59, 60, +39 more

## ui_style.css.html

### [INFO] contrast (6)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 193 - `color: #fff`
- line 540 - `color: #fff`
- line 549 - `color: #fff`
- line 601 - `color: #fff`
- line 619 - `color: #fff`
- line 2096 - `color: #fff`

## ui_tutorials.html

### [INFO] button-type (4)
Add type="button" to avoid accidental form submits.

- line 386
- line 424
- line 546
- line 626

### [INFO] responsive-width (5)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 569 - `style="width: 120px`
- line 571 - `style="width: 140px`
- line 572 - `style="width: 120px`
- line 573 - `style="width: 100px`
- line 574 - `style="width: 180px`

### [INFO] inline-style (10)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 10 occurrence(s). First lines: 424, 546, 569, 571, 572, 573, 574, 590, +2 more

## ui_usageReport.html

### [INFO] button-type (5)
Add type="button" to avoid accidental form submits.

- line 264
- line 391
- line 525
- line 526
- line 527

### [INFO] responsive-width (8)
Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.

- line 290 - `style="background: linear-gradient(135deg, #ff6b6b, #ff5252); color: white; padd`
- line 324 - `style="background: linear-gradient(135deg, #4fc3f7, #29b6f6); color: white; padd`
- line 358 - `style="background: linear-gradient(135deg, #48bb78, #38a169); color: white; padd`
- line 430 - `style="flex: 1; max-width: 300px`
- line 462 - `style="flex: 1; max-width: 300px`
- line 915 - `style="background:#dc3545;color:white;padding:12px 20px;border-radius:10px;text-`
- line 916 - `style="background:#fd7e14;color:white;padding:12px 20px;border-radius:10px;text-`
- line 917 - `style="background:#28a745;color:white;padding:12px 20px;border-radius:10px;text-`

### [INFO] inline-style (169)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 169 occurrence(s). First lines: 215, 222, 227, 233, 239, 240, 241, 243, +161 more

## ui_utils.html

### [INFO] button-type (3)
Add type="button" to avoid accidental form submits.

- line 412
- line 415
- line 467

### [INFO] contrast (3)
Verify text contrast is at least 4.5:1 (WCAG AA).

- line 686 - `color: #fff`
- line 697 - `color:#fff`
- line 698 - `color:#fff`

### [INFO] inline-style (5)
Move repeated inline styles into a CSS class in a <style> block or stylesheet.

- 5 occurrence(s). First lines: 696, 697, 698, 700, 701
