/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import {
  partition,
  extractRelevantHistoricalChanges,
  computeProjectionBins,
  ABSTRACT_NODE_BINS
} from '@/utils/histogram-util';
import { getYearFromTimestamp } from '@/utils/date-util';

// Historical monthly rainfall in mm downloaded from World Bank Climate Change knowledge portal for test by John Smith
const ETHIOPIA_MONTHLY_RAINFALL = [
  { timestamp: 662688000000, value: 11.6000003815 },
  { timestamp: 665366400000, value: 22.2999992371 },
  { timestamp: 667785600000, value: 61.7000007629 },
  { timestamp: 670464000000, value: 65.5999984741 },
  { timestamp: 673056000000, value: 89.4000015259 },
  { timestamp: 675734400000, value: 74.6999969482 },
  { timestamp: 678326400000, value: 134.6000061035 },
  { timestamp: 681004800000, value: 121.8000030518 },
  { timestamp: 683683200000, value: 93.0999984741 },
  { timestamp: 686275200000, value: 42.7999992371 },
  { timestamp: 688953600000, value: 11.8999996185 },
  { timestamp: 691545600000, value: 16.8999996185 },
  { timestamp: 694224000000, value: 18.7000007629 },
  { timestamp: 696902400000, value: 15.8000001907 },
  { timestamp: 699408000000, value: 21.7999992371 },
  { timestamp: 702086400000, value: 68.3000030518 },
  { timestamp: 704678400000, value: 76.3000030518 },
  { timestamp: 707356800000, value: 64.0999984741 },
  { timestamp: 709948800000, value: 100.6999969482 },
  { timestamp: 712627200000, value: 142.6999969482 },
  { timestamp: 715305600000, value: 97.0999984741 },
  { timestamp: 717897600000, value: 86.5999984741 },
  { timestamp: 720576000000, value: 46.7000007629 },
  { timestamp: 723168000000, value: 20.7999992371 },
  { timestamp: 725846400000, value: 21.3999996185 },
  { timestamp: 728524800000, value: 29.2000007629 },
  { timestamp: 730944000000, value: 22.2000007629 },
  { timestamp: 733622400000, value: 130.6000061035 },
  { timestamp: 736214400000, value: 129.5 },
  { timestamp: 738892800000, value: 80.4000015259 },
  { timestamp: 741484800000, value: 116.9000015259 },
  { timestamp: 744163200000, value: 133 },
  { timestamp: 746841600000, value: 83.6999969482 },
  { timestamp: 749433600000, value: 83.9000015259 },
  { timestamp: 752112000000, value: 11.3999996185 },
  { timestamp: 754704000000, value: 4.9000000954 },
  { timestamp: 757382400000, value: 2.7000000477 },
  { timestamp: 760060800000, value: 3 },
  { timestamp: 762480000000, value: 23.6000003815 },
  { timestamp: 765158400000, value: 69.8000030518 },
  { timestamp: 767750400000, value: 93.0999984741 },
  { timestamp: 770428800000, value: 88.1999969482 },
  { timestamp: 773020800000, value: 148.3000030518 },
  { timestamp: 775699200000, value: 180.6000061035 },
  { timestamp: 778377600000, value: 95.6999969482 },
  { timestamp: 780969600000, value: 44.7999992371 },
  { timestamp: 783648000000, value: 56.5 },
  { timestamp: 786240000000, value: 5.9000000954 },
  { timestamp: 788918400000, value: 1.3999999762 },
  { timestamp: 791596800000, value: 14.8000001907 },
  { timestamp: 794016000000, value: 48 },
  { timestamp: 796694400000, value: 100.9000015259 },
  { timestamp: 799286400000, value: 84.1999969482 },
  { timestamp: 801964800000, value: 58.0999984741 },
  { timestamp: 804556800000, value: 121.6999969482 },
  { timestamp: 807235200000, value: 136.3000030518 },
  { timestamp: 809913600000, value: 79.3000030518 },
  { timestamp: 812505600000, value: 46 },
  { timestamp: 815184000000, value: 15.1999998093 },
  { timestamp: 817776000000, value: 23 },
  { timestamp: 820454400000, value: 17.2000007629 },
  { timestamp: 823132800000, value: 8.6000003815 },
  { timestamp: 825638400000, value: 78.0999984741 },
  { timestamp: 828316800000, value: 97.9000015259 },
  { timestamp: 830908800000, value: 143.3999938965 },
  { timestamp: 833587200000, value: 101.8000030518 },
  { timestamp: 836179200000, value: 124.3000030518 },
  { timestamp: 838857600000, value: 129.6999969482 },
  { timestamp: 841536000000, value: 81.8000030518 },
  { timestamp: 844128000000, value: 32 },
  { timestamp: 846806400000, value: 34.0999984741 },
  { timestamp: 849398400000, value: 6.3000001907 },
  { timestamp: 852076800000, value: 13.8999996185 },
  { timestamp: 854755200000, value: 2 },
  { timestamp: 857174400000, value: 41.0999984741 },
  { timestamp: 859852800000, value: 102.5 },
  { timestamp: 862444800000, value: 78.1999969482 },
  { timestamp: 865123200000, value: 95.0999984741 },
  { timestamp: 867715200000, value: 118.8000030518 },
  { timestamp: 870393600000, value: 108.1999969482 },
  { timestamp: 873072000000, value: 66.0999984741 },
  { timestamp: 875664000000, value: 143.3000030518 },
  { timestamp: 878342400000, value: 77.3000030518 },
  { timestamp: 880934400000, value: 18.3999996185 },
  { timestamp: 883612800000, value: 28.7999992371 },
  { timestamp: 886291200000, value: 15.8000001907 },
  { timestamp: 888710400000, value: 36.0999984741 },
  { timestamp: 891388800000, value: 63.0999984741 },
  { timestamp: 893980800000, value: 107.6999969482 },
  { timestamp: 896659200000, value: 66.9000015259 },
  { timestamp: 899251200000, value: 141.1999969482 },
  { timestamp: 901929600000, value: 171.6999969482 },
  { timestamp: 904608000000, value: 93.5 },
  { timestamp: 907200000000, value: 111.1999969482 },
  { timestamp: 909878400000, value: 22 },
  { timestamp: 912470400000, value: 2 },
  { timestamp: 915148800000, value: 9 },
  { timestamp: 917827200000, value: 4.8000001907 },
  { timestamp: 920246400000, value: 42.7999992371 },
  { timestamp: 922924800000, value: 42.5 },
  { timestamp: 925516800000, value: 80.5999984741 },
  { timestamp: 928195200000, value: 55.0999984741 },
  { timestamp: 930787200000, value: 115.1999969482 },
  { timestamp: 933465600000, value: 146.8000030518 },
  { timestamp: 936144000000, value: 102.9000015259 },
  { timestamp: 938736000000, value: 121.6999969482 },
  { timestamp: 941414400000, value: 15 },
  { timestamp: 944006400000, value: 6.1999998093 },
  { timestamp: 946684800000, value: 3.4000000954 },
  { timestamp: 949363200000, value: 3.4000000954 },
  { timestamp: 951868800000, value: 27.5 },
  { timestamp: 954547200000, value: 71.0999984741 },
  { timestamp: 957139200000, value: 129.6999969482 },
  { timestamp: 959817600000, value: 79.3000030518 },
  { timestamp: 962409600000, value: 150.3999938965 },
  { timestamp: 965088000000, value: 145.3000030518 },
  { timestamp: 967766400000, value: 113.5999984741 },
  { timestamp: 970358400000, value: 65.9000015259 },
  { timestamp: 973036800000, value: 45.7000007629 },
  { timestamp: 975628800000, value: 13 },
  { timestamp: 978307200000, value: 11.8999996185 },
  { timestamp: 980985600000, value: 8.1000003815 },
  { timestamp: 983404800000, value: 62 },
  { timestamp: 986083200000, value: 57.0999984741 },
  { timestamp: 988675200000, value: 73.1999969482 },
  { timestamp: 991353600000, value: 86.1999969482 },
  { timestamp: 993945600000, value: 156.1000061035 },
  { timestamp: 996624000000, value: 143.6999969482 },
  { timestamp: 999302400000, value: 86.4000015259 },
  { timestamp: 1001894400000, value: 72.8000030518 },
  { timestamp: 1004572800000, value: 34.7000007629 },
  { timestamp: 1007164800000, value: 9.6000003815 },
  { timestamp: 1009843200000, value: 20.2000007629 },
  { timestamp: 1012521600000, value: 14.6999998093 },
  { timestamp: 1014940800000, value: 29.6000003815 },
  { timestamp: 1017619200000, value: 76.5 },
  { timestamp: 1020211200000, value: 76.9000015259 },
  { timestamp: 1022889600000, value: 64.4000015259 },
  { timestamp: 1025481600000, value: 116.9000015259 },
  { timestamp: 1028160000000, value: 124.6999969482 },
  { timestamp: 1030838400000, value: 70.5999984741 },
  { timestamp: 1033430400000, value: 79 },
  { timestamp: 1036108800000, value: 22.7999992371 },
  { timestamp: 1038700800000, value: 26.8999996185 },
  { timestamp: 1041379200000, value: 9.3000001907 },
  { timestamp: 1044057600000, value: 22.2000007629 },
  { timestamp: 1046476800000, value: 32.7999992371 },
  { timestamp: 1049155200000, value: 80.4000015259 },
  { timestamp: 1051747200000, value: 53.7999992371 },
  { timestamp: 1054425600000, value: 100 },
  { timestamp: 1057017600000, value: 139.8000030518 },
  { timestamp: 1059696000000, value: 124.0999984741 },
  { timestamp: 1062374400000, value: 108.3000030518 },
  { timestamp: 1064966400000, value: 56.5999984741 },
  { timestamp: 1067644800000, value: 21.8999996185 },
  { timestamp: 1070236800000, value: 20.1000003815 },
  { timestamp: 1072915200000, value: 17.5 },
  { timestamp: 1075593600000, value: 13.6000003815 },
  { timestamp: 1078099200000, value: 28.1000003815 },
  { timestamp: 1080777600000, value: 97.5999984741 },
  { timestamp: 1083369600000, value: 81.0999984741 },
  { timestamp: 1086048000000, value: 67.9000015259 },
  { timestamp: 1088640000000, value: 120.6999969482 },
  { timestamp: 1091318400000, value: 126.3000030518 },
  { timestamp: 1093996800000, value: 86.5999984741 },
  { timestamp: 1096588800000, value: 117 },
  { timestamp: 1099267200000, value: 35 },
  { timestamp: 1101859200000, value: 11.8000001907 },
  { timestamp: 1104537600000, value: 15 },
  { timestamp: 1107216000000, value: 15.6999998093 },
  { timestamp: 1109635200000, value: 55.0999984741 },
  { timestamp: 1112313600000, value: 86.0999984741 },
  { timestamp: 1114905600000, value: 103.1999969482 },
  { timestamp: 1117584000000, value: 79 },
  { timestamp: 1120176000000, value: 144.5 },
  { timestamp: 1122854400000, value: 158.8999938965 },
  { timestamp: 1125532800000, value: 96.6999969482 },
  { timestamp: 1128124800000, value: 62.4000015259 },
  { timestamp: 1130803200000, value: 25 },
  { timestamp: 1133395200000, value: 3.5 },
  { timestamp: 1136073600000, value: 5.8000001907 },
  { timestamp: 1138752000000, value: 10.6999998093 },
  { timestamp: 1141171200000, value: 54.4000015259 },
  { timestamp: 1143849600000, value: 76.0999984741 },
  { timestamp: 1146441600000, value: 95.9000015259 },
  { timestamp: 1149120000000, value: 66.3000030518 },
  { timestamp: 1151712000000, value: 157.6999969482 },
  { timestamp: 1154390400000, value: 141.1000061035 },
  { timestamp: 1157068800000, value: 113.5999984741 },
  { timestamp: 1159660800000, value: 85.4000015259 },
  { timestamp: 1162339200000, value: 28.2999992371 },
  { timestamp: 1164931200000, value: 24.7000007629 },
  { timestamp: 1167609600000, value: 13.6000003815 },
  { timestamp: 1170288000000, value: 15.3999996185 },
  { timestamp: 1172707200000, value: 36 },
  { timestamp: 1175385600000, value: 79.5 },
  { timestamp: 1177977600000, value: 96.4000015259 },
  { timestamp: 1180656000000, value: 89.5999984741 },
  { timestamp: 1183248000000, value: 157.6000061035 },
  { timestamp: 1185926400000, value: 140.6000061035 },
  { timestamp: 1188604800000, value: 105 },
  { timestamp: 1191196800000, value: 80.6999969482 },
  { timestamp: 1193875200000, value: 21.7999992371 },
  { timestamp: 1196467200000, value: 5.0999999046 },
  { timestamp: 1199145600000, value: 9.5 },
  { timestamp: 1201824000000, value: 7.4000000954 },
  { timestamp: 1204329600000, value: 20.7000007629 },
  { timestamp: 1207008000000, value: 70.0999984741 },
  { timestamp: 1209600000000, value: 137.5 },
  { timestamp: 1212278400000, value: 83.5 },
  { timestamp: 1214870400000, value: 133.6000061035 },
  { timestamp: 1217548800000, value: 141.8999938965 },
  { timestamp: 1220227200000, value: 84 },
  { timestamp: 1222819200000, value: 80.5999984741 },
  { timestamp: 1225497600000, value: 58 },
  { timestamp: 1228089600000, value: 14.3000001907 },
  { timestamp: 1230768000000, value: 18.5 },
  { timestamp: 1233446400000, value: 15.3999996185 },
  { timestamp: 1235865600000, value: 26.7000007629 },
  { timestamp: 1238544000000, value: 62.2999992371 },
  { timestamp: 1241136000000, value: 70.5999984741 },
  { timestamp: 1243814400000, value: 72.5 },
  { timestamp: 1246406400000, value: 132.8000030518 },
  { timestamp: 1249084800000, value: 152.6999969482 },
  { timestamp: 1251763200000, value: 74.9000015259 },
  { timestamp: 1254355200000, value: 87 },
  { timestamp: 1257033600000, value: 28.8999996185 },
  { timestamp: 1259625600000, value: 14.5 },
  { timestamp: 1262304000000, value: 9.6000003815 },
  { timestamp: 1264982400000, value: 30.8999996185 },
  { timestamp: 1267401600000, value: 46.2999992371 },
  { timestamp: 1270080000000, value: 86.5999984741 },
  { timestamp: 1272672000000, value: 94.1999969482 },
  { timestamp: 1275350400000, value: 80.4000015259 },
  { timestamp: 1277942400000, value: 132.8000030518 },
  { timestamp: 1280620800000, value: 139.6999969482 },
  { timestamp: 1283299200000, value: 85.5 },
  { timestamp: 1285891200000, value: 78 },
  { timestamp: 1288569600000, value: 39.5999984741 },
  { timestamp: 1291161600000, value: 20.3999996185 },
  { timestamp: 1293840000000, value: 11.6000003815 },
  { timestamp: 1296518400000, value: 7.5999999046 },
  { timestamp: 1298937600000, value: 34.2999992371 },
  { timestamp: 1301616000000, value: 100.8000030518 },
  { timestamp: 1304208000000, value: 106.3000030518 },
  { timestamp: 1306886400000, value: 76.0999984741 },
  { timestamp: 1309478400000, value: 122 },
  { timestamp: 1312156800000, value: 142.5 },
  { timestamp: 1314835200000, value: 114.1999969482 },
  { timestamp: 1317427200000, value: 46.2000007629 },
  { timestamp: 1320105600000, value: 40.5 },
  { timestamp: 1322697600000, value: 15.8999996185 },
  { timestamp: 1325376000000, value: 11.6000003815 },
  { timestamp: 1328054400000, value: 19.5 },
  { timestamp: 1330560000000, value: 40.4000015259 },
  { timestamp: 1333238400000, value: 96.5999984741 },
  { timestamp: 1335830400000, value: 98.9000015259 },
  { timestamp: 1338508800000, value: 73.5 },
  { timestamp: 1341100800000, value: 143.8999938965 },
  { timestamp: 1343779200000, value: 135 },
  { timestamp: 1346457600000, value: 104.1999969482 },
  { timestamp: 1349049600000, value: 71.0999984741 },
  { timestamp: 1351728000000, value: 33.7999992371 },
  { timestamp: 1354320000000, value: 15.6000003815 },
  { timestamp: 1356998400000, value: 17.1000003815 },
  { timestamp: 1359676800000, value: 8 },
  { timestamp: 1362096000000, value: 54.2000007629 },
  { timestamp: 1364774400000, value: 99.4000015259 },
  { timestamp: 1367366400000, value: 151.5 },
  { timestamp: 1370044800000, value: 50.9000015259 },
  { timestamp: 1372636800000, value: 115.1999969482 },
  { timestamp: 1375315200000, value: 159.3000030518 },
  { timestamp: 1377993600000, value: 76.0999984741 },
  { timestamp: 1380585600000, value: 114.4000015259 },
  { timestamp: 1383264000000, value: 48.5999984741 },
  { timestamp: 1385856000000, value: 4 },
  { timestamp: 1388534400000, value: 6.0999999046 },
  { timestamp: 1391212800000, value: 12 },
  { timestamp: 1393632000000, value: 45.5999984741 },
  { timestamp: 1396310400000, value: 107.8000030518 },
  { timestamp: 1398902400000, value: 119 },
  { timestamp: 1401580800000, value: 52.2999992371 },
  { timestamp: 1404172800000, value: 138.3999938965 },
  { timestamp: 1406851200000, value: 154 },
  { timestamp: 1409529600000, value: 108.5 },
  { timestamp: 1412121600000, value: 120.8000030518 },
  { timestamp: 1414800000000, value: 25.1000003815 },
  { timestamp: 1417392000000, value: 13.6999998093 },
  { timestamp: 1420070400000, value: 8 },
  { timestamp: 1422748800000, value: 16.3999996185 },
  { timestamp: 1425168000000, value: 34 },
  { timestamp: 1427846400000, value: 62.4000015259 },
  { timestamp: 1430438400000, value: 128.6000061035 },
  { timestamp: 1433116800000, value: 94.3000030518 },
  { timestamp: 1435708800000, value: 101.8000030518 },
  { timestamp: 1438387200000, value: 149.1999969482 },
  { timestamp: 1441065600000, value: 94.1999969482 },
  { timestamp: 1443657600000, value: 81.9000015259 },
  { timestamp: 1446336000000, value: 35.2999992371 },
  { timestamp: 1448928000000, value: 16.2999992371 },
  { timestamp: 1451606400000, value: 14 },
  { timestamp: 1454284800000, value: 17.6000003815 },
  { timestamp: 1456790400000, value: 29.1000003815 },
  { timestamp: 1459468800000, value: 137.8000030518 },
  { timestamp: 1462060800000, value: 142.1999969482 },
  { timestamp: 1464739200000, value: 72.8000030518 },
  { timestamp: 1467331200000, value: 141.1999969482 },
  { timestamp: 1470009600000, value: 156.3000030518 },
  { timestamp: 1472688000000, value: 92.6999969482 },
  { timestamp: 1475280000000, value: 56.2999992371 },
  { timestamp: 1477958400000, value: 32.5999984741 },
  { timestamp: 1480550400000, value: 9.1999998093 },
  { timestamp: 1483228800000, value: 2.7999999523 },
  { timestamp: 1485907200000, value: 17.7999992371 },
  { timestamp: 1488326400000, value: 48 },
  { timestamp: 1491004800000, value: 111.1999969482 },
  { timestamp: 1493596800000, value: 129.1000061035 },
  { timestamp: 1496275200000, value: 73.5999984741 },
  { timestamp: 1498867200000, value: 126.5999984741 },
  { timestamp: 1501545600000, value: 148.6999969482 },
  { timestamp: 1504224000000, value: 123.9000015259 },
  { timestamp: 1506816000000, value: 104.3000030518 },
  { timestamp: 1509494400000, value: 24.6000003815 },
  { timestamp: 1512086400000, value: 2.0999999046 },
  { timestamp: 1514764800000, value: 4.6999998093 },
  { timestamp: 1517443200000, value: 24.7000007629 },
  { timestamp: 1519862400000, value: 68 },
  { timestamp: 1522540800000, value: 87.6999969482 },
  { timestamp: 1525132800000, value: 115.4000015259 },
  { timestamp: 1527811200000, value: 91 },
  { timestamp: 1530403200000, value: 128.5 },
  { timestamp: 1533081600000, value: 153.1000061035 },
  { timestamp: 1535760000000, value: 96.1999969482 },
  { timestamp: 1538352000000, value: 71.9000015259 },
  { timestamp: 1541030400000, value: 37.2999992371 },
  { timestamp: 1543622400000, value: 10.8999996185 },
  { timestamp: 1546300800000, value: 5.0999999046 },
  { timestamp: 1548979200000, value: 16 },
  { timestamp: 1551398400000, value: 40.9000015259 },
  { timestamp: 1554076800000, value: 106.8000030518 },
  { timestamp: 1556668800000, value: 104.4000015259 },
  { timestamp: 1559347200000, value: 126.8000030518 },
  { timestamp: 1561939200000, value: 120.4000015259 },
  { timestamp: 1564617600000, value: 136.3999938965 },
  { timestamp: 1567296000000, value: 121.6999969482 },
  { timestamp: 1569888000000, value: 121.3000030518 },
  { timestamp: 1572566400000, value: 69.9000015259 },
  { timestamp: 1575158400000, value: 16.7000007629 },
  { timestamp: 1577836800000, value: 10.3000001907 },
  { timestamp: 1580515200000, value: 19.5 },
  { timestamp: 1583020800000, value: 38.5 },
  { timestamp: 1585699200000, value: 91 },
  { timestamp: 1588291200000, value: 123.0999984741 },
  { timestamp: 1590969600000, value: 76.1999969482 },
  { timestamp: 1593561600000, value: 138.6999969482 },
  { timestamp: 1596240000000, value: 183.3999938965 },
  { timestamp: 1598918400000, value: 121 },
  { timestamp: 1601510400000, value: 57 },
  { timestamp: 1604188800000, value: 35.9000015259 },
  { timestamp: 1606780800000, value: 11.6000003815 }
];

describe('HistogramUtil', () => {
  describe('.partition()', () => {
    it('works correctly with unsorted values', () => {
      const result = partition([6, 8, 10, 4, 2], 0.2);
      expect(result)
        .to.be.greaterThan(2)
        .and.lessThan(4);
    });
    it('when passed an array of length 1, returns the value of its one element', () => {
      const result = partition([6], 0.2);
      expect(result).to.equal(6);
    });
    it('works correctly with an array of length 2', () => {
      const result = partition([6, 4], 0.2);
      expect(result)
        .to.be.greaterThan(4)
        .and.lessThan(6);
    });
    it('when passed an array of several elements with the same value, returns that value', () => {
      const result = partition([11, 11, 11, 11, 11], 0.2);
      expect(result).to.equal(11);
    });
  });

  describe('.extractRelevantHistoricalChanges()', () => {
    const janToJanResult = extractRelevantHistoricalChanges(
      ETHIOPIA_MONTHLY_RAINFALL,
      12,
      0
    );
    const janToJuneResult = extractRelevantHistoricalChanges(
      ETHIOPIA_MONTHLY_RAINFALL,
      6,
      0
    );
    const lastYear = getYearFromTimestamp(
      ETHIOPIA_MONTHLY_RAINFALL[ETHIOPIA_MONTHLY_RAINFALL.length - 1].timestamp
    );
    const firstYear = getYearFromTimestamp(
      ETHIOPIA_MONTHLY_RAINFALL[0].timestamp
    );
    it('returns [] when historicalData is empty', () => {
      const result = extractRelevantHistoricalChanges([], 12, 0);
      expect(result).to.be.an('array').that.is.empty;
    });
    it('produces a number of annual changes approximately equal to the number of years in the dataset', () => {
      expect(janToJanResult.length).to.be.approximately(
        lastYear - firstYear,
        2
      );
    });
    it('produces a number of Jan-to-June changes approximately equal to the number of years in the dataset', () => {
      expect(janToJuneResult.length).to.be.approximately(
        lastYear - firstYear,
        2
      );
    });
  });

  describe('.computeProjectionBins()', () => {
    const janToJanResult = computeProjectionBins(
      ETHIOPIA_MONTHLY_RAINFALL,
      null,
      12,
      0
    );
    const janToJuneResult = computeProjectionBins(
      ETHIOPIA_MONTHLY_RAINFALL,
      null,
      6,
      0
    );
    const julyToJanResult = computeProjectionBins(
      ETHIOPIA_MONTHLY_RAINFALL,
      null,
      6,
      6
    );
    it('returns ABSTRACT_NODE_BINS when historicalData is empty', () => {
      const result = computeProjectionBins([], 0, 12, 0);
      expect(result).to.equal(ABSTRACT_NODE_BINS);
    });
    describe('when t0 is clamped', () => {
      const t0ClampValue1 = 100;
      const janToJanClampedT0Result1 = computeProjectionBins(
        ETHIOPIA_MONTHLY_RAINFALL,
        t0ClampValue1,
        12,
        0
      );
      const t0ClampValue2 = 200;
      const janToJanClampedT0Result2 = computeProjectionBins(
        ETHIOPIA_MONTHLY_RAINFALL,
        t0ClampValue2,
        12,
        0
      );
      it('returns the same bin size, offset by the difference in clamped value', () => {
        const withOffsetRemoved = janToJanClampedT0Result2.map(
          value => value + (t0ClampValue1 - t0ClampValue2)
        );
        expect(withOffsetRemoved).to.deep.equal(janToJanClampedT0Result1);
      });
    });
    it("produces wider bins when interval is Jan to June than when it's Jan to Jan", () => {
      const janToJuneRange = janToJuneResult[3] - janToJuneResult[0];
      const janToJanRange = janToJanResult[3] - janToJanResult[0];
      expect(janToJuneRange).to.be.greaterThan(janToJanRange);
    });
    it('produces symmetrical bins when all values are higher', () => {
      const midPoint = (janToJuneResult[3] + janToJuneResult[0]) / 2;
      const absoluteDifferences = janToJuneResult.map(value =>
        Math.abs(value - midPoint)
      );
      expect(absoluteDifferences[0]).to.equal(absoluteDifferences[3]);
      expect(absoluteDifferences[1]).to.equal(absoluteDifferences[2]);
    });
    it('produces symmetrical bins when all values are lower', () => {
      const midPoint = (julyToJanResult[3] + julyToJanResult[0]) / 2;
      const absoluteDifferences = julyToJanResult.map(value =>
        Math.abs(value - midPoint)
      );
      expect(absoluteDifferences[0]).to.equal(absoluteDifferences[3]);
      expect(absoluteDifferences[1]).to.equal(absoluteDifferences[2]);
    });
    it("returns nowValue + ABSTRACT_NODE_BINS when there aren't enough data to split into 5 bins", () => {
      const result = computeProjectionBins(
        [
          { timestamp: 662688000000, value: 11.6000003815 },
          { timestamp: 665366400000, value: 22.2999992371 },
          { timestamp: 667785600000, value: 61.7000007629 }
        ],
        100,
        12,
        0
      );
      expect(result).to.deep.equal(
        ABSTRACT_NODE_BINS.map(binBoundary => binBoundary + 100)
      );
    });
  });
});
