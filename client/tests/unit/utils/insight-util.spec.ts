import { expect } from 'chai';
import InsightUtil from '@/utils/insight-util';
import { AnalyticalQuestion, Insight } from '@/types/Insight';
import _ from 'lodash';

const makeSection = (
  id: string,
  linkedInsightIds: string[]
): AnalyticalQuestion => {
  return {
    id,
    question: '',
    linked_insights: linkedInsightIds,
    target_view: [],
    url: '',
    view_state: {},
    visibility: ''
  };
};

const makeInsight = (id: string, sectionIds: string[]): Insight => {
  return {
    id,
    name: '',
    is_default: false,
    analytical_question: sectionIds,
    visibility: '',
    url: '',
    target_view: []
  };
};
const DUMMY_SECTION_ID = 'dummySection';
const TARGET_SECTION_ID = 'targetSection';
const INSIGHT_1_ID = 'insight1';
const INSIGHT_2_ID = 'insight2';

describe('insight-util', () => {
  describe('getIndexInSectionsAndInsights', () => {
    it('returns 0 when no section is passed', () => {
      expect(
        InsightUtil.getIndexInSectionsAndInsights([], null, null, [])
      ).to.equal(0);
    });
    it('works when the target section has no insights', () => {
      const dummyInsight = makeInsight(INSIGHT_1_ID, [DUMMY_SECTION_ID]);
      const dummyInsight2 = makeInsight(INSIGHT_2_ID, [DUMMY_SECTION_ID]);
      const dummySection = makeSection(DUMMY_SECTION_ID, [
        INSIGHT_1_ID,
        INSIGHT_2_ID
      ]);
      const targetSection = makeSection(TARGET_SECTION_ID, []);
      const sectionsAndInsights: (AnalyticalQuestion | Insight)[] = [
        dummyInsight,
        dummyInsight2,
        targetSection
      ];
      const sortedSections = [dummySection, targetSection];
      expect(
        InsightUtil.getIndexInSectionsAndInsights(
          sectionsAndInsights,
          targetSection,
          null,
          sortedSections
        )
      ).to.equal(2);
    });
    it('works when the preceeding section has no insights', () => {
      const dummySection = makeSection(DUMMY_SECTION_ID, []);
      const targetInsight = makeInsight(INSIGHT_1_ID, [TARGET_SECTION_ID]);
      const targetInsight2 = makeInsight(INSIGHT_2_ID, [TARGET_SECTION_ID]);
      const targetSection = makeSection(TARGET_SECTION_ID, [
        INSIGHT_1_ID,
        INSIGHT_2_ID
      ]);
      const sectionsAndInsights: (AnalyticalQuestion | Insight)[] = [
        dummySection,
        targetInsight,
        targetInsight2
      ];
      const sortedSections = [dummySection, targetSection];
      expect(
        InsightUtil.getIndexInSectionsAndInsights(
          sectionsAndInsights,
          targetSection,
          null,
          sortedSections
        )
      ).to.equal(1);
    });
    it("works when the section's first insight is also assigned to an earlier section", () => {
      const dummySection = makeSection(DUMMY_SECTION_ID, [
        INSIGHT_1_ID,
        INSIGHT_2_ID
      ]);
      const targetSection = makeSection(TARGET_SECTION_ID, [INSIGHT_1_ID]);
      const insight = makeInsight(INSIGHT_1_ID, [
        DUMMY_SECTION_ID,
        TARGET_SECTION_ID
      ]);
      const insight2 = makeInsight(INSIGHT_2_ID, [TARGET_SECTION_ID]);
      const sectionsAndInsights: (AnalyticalQuestion | Insight)[] = [
        insight,
        insight2,
        insight
      ];
      const sortedSections = [dummySection, targetSection];
      expect(
        InsightUtil.getIndexInSectionsAndInsights(
          sectionsAndInsights,
          targetSection,
          null,
          sortedSections
        )
      ).to.equal(2);
    });
    it('works when jumping to the second insight in a section', () => {
      const dummySection = makeSection(DUMMY_SECTION_ID, [
        INSIGHT_1_ID,
        INSIGHT_2_ID
      ]);
      const targetSection = makeSection(TARGET_SECTION_ID, [
        INSIGHT_1_ID,
        INSIGHT_2_ID
      ]);
      const insight = makeInsight(INSIGHT_1_ID, [
        DUMMY_SECTION_ID,
        TARGET_SECTION_ID
      ]);
      const insight2 = makeInsight(INSIGHT_2_ID, [
        DUMMY_SECTION_ID,
        TARGET_SECTION_ID
      ]);
      const sectionsAndInsights: (AnalyticalQuestion | Insight)[] = [
        insight,
        insight2,
        insight,
        insight2
      ];
      const sortedSections = [dummySection, targetSection];
      expect(
        InsightUtil.getIndexInSectionsAndInsights(
          sectionsAndInsights,
          targetSection,
          INSIGHT_2_ID,
          sortedSections
        )
      ).to.equal(3);
    });
  });
});
