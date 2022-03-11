<template>
  <div class="dataset-overview-container">
    <modal-confirmation
      v-if="showApplyToAllModal"
      :autofocus-confirm="false"
      @confirm="applyVizToAll($route.query.template_id)"
      @close="closeApplyVizModal"
    >
      <template #title>Apply Settings To All</template>
      <template #message>
        <p>Did you want to apply the saved visualization settings to all indicators in this dataset?</p>
        <message-display
          :message="'Warning: Any visualization settings in the other indicators will be overwritten.'"
          :message-type="'alert-warning'"
        />
      </template>
    </modal-confirmation>
    <header>
      <div class="metadata-column">
        <div style="display: flex">
          <textarea
            v-model="editedDataset.name"
            type="text"
            wrap="off"
            rows="1"
            style="font-size: 1.17em; font-weight: bold; width: 95%; overflow-x: hidden"
          />
          <span style="padding: 4px; margin-left: 5px" :style="{ backgroundColor: statusColor }"><b>{{ statusLabel }}</b></span>
        </div>
        <textarea
          v-model="editedDataset.description"
          type="text"
          rows="4"
          class="edit-desc"
        />
        <div style="display: flex">
          <strong>Dataset Source:</strong>
          <textarea
            v-model="editedDataset.maintainer.organization"
            type="text"
            wrap="off"
            rows="1"
            style="flex-grow: 1; overflow-x: hidden"
          />
          <strong>Dataset Website:</strong>
          <textarea
            v-model="editedDataset.maintainer.website"
            type="text"
            wrap="off"
            rows="1"
            style="flex-grow: 1; overflow-x: hidden"
          />
        </div>
        <div style="display: flex">
          <strong>Registered By:</strong>
          <textarea
            v-model="editedDataset.maintainer.name"
            type="text"
            wrap="off"
            rows="1"
            style="flex-grow: 1; overflow-x: hidden"
          />
          <strong>Email:</strong>
          <textarea
            v-model="editedDataset.maintainer.email"
            type="text"
            wrap="off"
            rows="1"
            style="flex-grow: 1; overflow-x: hidden"
          />
          <button
            :disabled="!isDirty"
            @click="saveChanges"
            class="btn btn-sm btn-primary"
          >SAVE</button>
        </div>
      </div>
<!--      <div v-if="dataset.tags?.length > 0" class="tags-column">-->
<!--        <strong>Tags</strong>-->
<!--        <span v-for="tag in dataset.tags" :key="tag" class="tag">-->
<!--          {{ tag }}-->
<!--        </span>-->
<!--      </div>-->
      <div class="info-column">
        <div style="display: flex; align-items: center">
          <b>Domain(s): </b>
          <select name="domains" id="domains" @change="selectedDomain=AVAILABLE_DOMAINS[$event.target.selectedIndex]">
            <option v-for="domain in AVAILABLE_DOMAINS" :key="domain">
              {{domain}}
            </option>
          </select>
          <button type="button" class="btn btn-default" style="padding: 2px 4px" @click="addDomain">Add</button>
        </div>
        <div v-if="editedDataset.domains" style="display: flex; flex-wrap: wrap">
          <div v-for="domain in editedDataset.domains" :key="domain">
            <span style="margin: 2px; background-color: white;">{{domain}} <i @click="removeDomain(domain)" class="fa fa-remove" /></span>
          </div>
        </div>
        <div><b>Region: </b>{{countries}}</div>
        <div><b>Period: </b> {{period}}</div>
        <div><b>Runtime: </b> Queue: {{runtimeFormatter(dataset.runtimes?.queued)}}, Ingestion: {{runtimeFormatter(dataset.runtimes?.post_processing)}}</div>
      </div>
    </header>
    <main>
      <div class="insights-column">
        <div class="column-title">Insights</div>
        <list-context-insight-pane class="insights" :allow-new-insights="false" />
      </div>
      <div class="instance-list-column">
        <div class="instance-list-header">
          <div class="column-title">Indicators ({{indicatorCount}})</div>
          <div class="controls">
<!--            <div class="filter-options">-->
<!--              <label-->
<!--                v-for="filter of filterOptions"-->
<!--                :key="filter.status"-->
<!--                class="filter-label"-->
<!--                @click="filter.selected = !filter.selected">-->
<!--                <i-->
<!--                  class="fa fa-lg fa-fw"-->
<!--                  :class="{ 'fa-check-square-o': filter.selected, 'fa-square-o': !filter.selected }"-->
<!--                />-->
<!--                {{getDatacubeStatusInfo(filter.status).label}}-->
<!--              </label>-->
<!--            </div>-->
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search ..."
              class="form-control"
            >
            <div class="sorting">
              <div>
                <button
                  type="button"
                  class="btn btn-default"
                  @click="toggleSortingDropdown"
                ><span class="lbl">Sort by</span> - {{ selectedSortingOption }}
                  <i class="fa fa-caret-down" />
                </button>
              </div>
              <div v-if="showSortingDropdown">
                <dropdown-control class="dropdown">
                  <template #content>
                    <div
                      v-for="option in sortingOptions"
                      :key="option"
                      class="dropdown-option"
                      @click="setDatacubeSort(option)">
                      {{ option }}
                    </div>
                  </template>
                </dropdown-control>
              </div>
            </div>
          </div>
        </div>
        <div class="instance-list">
          <indicator-card
            v-for="indicator in filteredIndicators"
            :key="indicator.id"
            :datacube="indicator"
            :allow-editing="isReady"
            @apply-to-all="applyVizToAll(indicator.id)"
            @toggle-hidden="toggleHiddenState(indicator)"
            @update-meta="updateIndicator"
          />
          <message-display
            v-if="filteredIndicators.length === 0"
            :message-type="'alert-warning'"
            :message="'No indicators'"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import { mapActions, mapGetters } from 'vuex';
import IndicatorCard from '@/components/indicator-card.vue';
import filtersUtil from '@/utils/filters-util';
import { generateSparklines, getDatacubes, SparklineParams, updateIndicatorsBulk } from '@/services/new-datacube-service';
import _ from 'lodash';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import ListContextInsightPane from '@/components/context-insight-panel/list-context-insight-pane.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import { AVAILABLE_DOMAINS, getDatacubeStatusInfo } from '@/utils/datacube-util';
import { DatacubeStatus, TemporalResolution } from '@/types/Enums';
import { Datacube, DatacubeFeature, Dataset, DatasetEditable, Indicator } from '@/types/Datacube';
import { defineComponent } from 'vue';
import router from '@/router';
import moment from 'moment';
import useToaster from '@/services/composables/useToaster';
import { runtimeFormatter } from '@/utils/string-util';
import { ViewState } from '@/types/Insight';

const MAX_COUNTRIES = 40;

export default defineComponent({
  name: 'DatasetOverview',
  components: {
    IndicatorCard,
    ListContextInsightPane,
    DropdownControl,
    MessageDisplay,
    ModalConfirmation
  },
  data: () => ({
    indicators: [] as Indicator[],
    dataset: {} as Dataset,
    editedDataset: { name: '', description: '', maintainer: {}, domains: [] as string[] } as DatasetEditable,
    searchTerm: '',
    showSortingDropdown: false,
    sortingOptions: ['Most recent', 'Oldest'],
    selectedSortingOption: 'Most recent',
    showApplyToAllModal: false,
    AVAILABLE_DOMAINS,
    selectedDomain: AVAILABLE_DOMAINS[0]
    // filterOptions: [
    //   { status: DatacubeStatus.Ready, selected: true },
    //   { status: DatacubeStatus.Deprecated, selected: false }
    // ]
  }),
  computed: {
    ...mapGetters({
      dataId: 'app/project'
    }),
    filteredIndicators(): Indicator[] {
      const filtered = this.indicators.filter(indicator =>
        indicator.outputs[0].display_name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );

      const sortFunc = this.sortingOptions.indexOf(this.selectedSortingOption) === 1
        ? 'asc' : 'desc';
      return _.orderBy(filtered, ['created_at', 'name'], [sortFunc, 'asc']);
    },
    isReady() {
      return this.dataset.status === DatacubeStatus.Ready;
    },
    statusColor() {
      return this.getDatacubeStatusInfo(this.dataset.status).color;
    },
    statusLabel() {
      return this.getDatacubeStatusInfo(this.dataset.status).label;
    },
    indicatorCount() {
      if (this.filteredIndicators.length !== this.indicators.length) {
        return `${this.filteredIndicators.length}/${this.indicators.length}`;
      } else {
        return `${this.indicators.length}`;
      }
    },
    isDirty() {
      return this.editedDataset.name !== this.dataset.name ||
        this.editedDataset.description !== this.dataset.description ||
        !_.isEqual(this.editedDataset.maintainer, this.dataset.maintainer) ||
        !_.isEqual(this.editedDataset.domains, this.dataset.domains);
    },
    countries() {
      const country = this.dataset?.geography?.country;
      if (!country || country.length === 0) return '';
      return country.length < MAX_COUNTRIES
        ? country.join(', ')
        : `${country.slice(0, MAX_COUNTRIES - 1).join(', ')} and ${country.length - MAX_COUNTRIES} more.`;
    },
    period() {
      if (!this.dataset?.period) {
        return '';
      }
      const min = Number(this.dataset.period.gte);
      const max = Number(this.dataset.period.lte);
      const period = [min, max].map(t => moment(t).format('MMM YYYY'));
      return min === max ? period[0] : `${period[0]} - ${period[1]}`;
    }
  },
  async mounted() {
    await this.fetchIndicators();

    // ensure the insight explorer panel is closed in case the user has
    //  previously opened it and clicked the browser back button
    this.hideInsightPanel();

    if (this.$route.query.template_id) {
      this.showApplyToAllModal = true;
    }
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      hideInsightPanel: 'insightPanel/hideInsightPanel',
      setSelectedScenarioIds: 'modelPublishStore/setSelectedScenarioIds'
    }),
    addDomain() {
      if (!this.editedDataset.domains) {
        this.editedDataset.domains = [];
      }
      if (!this.editedDataset.domains.includes(this.selectedDomain)) {
        this.editedDataset.domains.push(this.selectedDomain);
      }
    },
    removeDomain(domain: string) {
      this.editedDataset.domains = this.editedDataset.domains.filter(d => d !== domain);
    },
    async fetchIndicators() {
      this.enableOverlay('Loading indicators');

      // fetch indicators
      const options = {
        excludes: [
          'outputs.ontologies',
          'qualifier_outputs.ontologies',
          'ontology_matches',
          'geography.admin1',
          'geography.admin2',
          'geography.admin3'
        ]
      };
      const newFilters = filtersUtil.newFilters();
      filtersUtil.addSearchTerm(newFilters, 'dataId', this.dataId, 'and', false);
      filtersUtil.addSearchTerm(newFilters, 'type', 'indicator', 'and', false);
      this.indicators = await getDatacubes(newFilters, options) as Indicator[];

      // reset to avoid invalid data fetch when a given indicator is loaded
      // while the info of a previous indicator is cached in the store
      this.setSelectedScenarioIds([]);

      // Update dataset fields using the first indicator. ALl indicators should have the same values.
      if (this.indicators[0]) {
        this.dataset = this.indicators[0] as Dataset;
        this.editedDataset = _.cloneDeep(this.dataset);
      }

      this.disableOverlay();
    },
    getDatacubeStatusInfo,
    runtimeFormatter,
    async saveChanges() {
      const toaster = useToaster();
      this.dataset.name = this.editedDataset.name;
      this.dataset.description = this.editedDataset.description;
      this.dataset.maintainer = this.editedDataset.maintainer;
      this.dataset.domains = this.editedDataset.domains;
      const deltas = this.indicators.map(indicator => ({
        id: indicator.id,
        name: this.editedDataset.name,
        description: this.editedDataset.description,
        maintainer: this.editedDataset.maintainer,
        domains: this.editedDataset.domains
      }));
      try {
        await updateIndicatorsBulk(deltas);
        toaster(`Updated ${deltas.length} indicators`, 'success');
      } catch {
        toaster('There was an issue with updating the indicators', 'error');
      }
      await this.fetchIndicators();
    },
    toggleHiddenState(/* indicator: Indicator */) {
      // TODO: Hiding/deprecating individual indicators is harder than it seems.
      // Fetching a dataset involves just grabbing the first indicator for each data_id.
      // If we modify the status of one indicator, we could misrepresent the entire dataset.
      // Alternatively, we could use the `is_visible` flag on each indicator's output, this however
      // makes updating the indicator slightly more difficult as we have to send the entire `outputs`
      // array and more importantly make filtering in the data explorer much more difficult.

      // if (indicator.status === DatacubeStatus.Ready) {
      //   indicator.status = DatacubeStatus.Deprecated;
      // } else if (indicator.status === DatacubeStatus.Deprecated) {
      //   indicator.status = DatacubeStatus.Ready;
      // }
    },
    async applyVizToAll(indicatorId: any) {
      const toaster = useToaster();
      this.showApplyToAllModal = false;
      await router.push({
        query: {
          template_id: undefined
        }
      });
      const source = this.indicators.find(indicator => indicator.id === indicatorId);
      if (source) {
        this.enableOverlay('Applying settings');
        const targets = this.indicators.filter(indicator => indicator.id !== indicatorId);
        const deltas = targets.map(indicator => ({
          id: indicator.id,
          default_view: source.default_view
        }));
        const sparklineList = targets.map(indicator => this.getSparklineParams(indicator, source.default_view));
        try {
          this.enableOverlay(`Generating ${sparklineList.length} previews`);
          await generateSparklines(sparklineList);

          this.enableOverlay(`Updating ${deltas.length} indicators`);
          await updateIndicatorsBulk(deltas);
          toaster(`Updated ${deltas.length} indicators`, 'success');
        } catch {
          toaster('The was an issue with applying the settings', 'error');
        }
        this.disableOverlay();
        await this.fetchIndicators();
      } else {
        toaster('Invalid template indicator', 'error');
      }
    },
    getSparklineParams(meta: Datacube, selections?: ViewState) {
      const output = meta.outputs[0];
      const feature = output.name;
      const rawResolution = output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
      const finalRawTimestamp = meta.period?.lte ?? 0;
      return {
        id: meta.id,
        dataId: meta.data_id,
        runId: 'indicator',
        feature: feature,
        resolution: selections?.temporalResolution ?? 'month',
        temporalAgg: selections?.temporalAggregation ?? 'mean',
        spatialAgg: selections?.spatialAggregation ?? 'mean',
        rawResolution: rawResolution,
        finalRawTimestamp: finalRawTimestamp
      } as SparklineParams;
    },
    closeApplyVizModal() {
      this.showApplyToAllModal = false;
      router.push({
        query: {
          template_id: undefined
        }
      }).catch(() => {});
    },
    async updateIndicator({ id, meta }: { id: string, meta: DatacubeFeature}) {
      const toaster = useToaster();
      try {
        await updateIndicatorsBulk([{
          id: id,
          outputs: [meta]
        }]);
        toaster('Indicator updated successfully', 'success');
      } catch {
        toaster('There was an issue with saving the changes', 'error');
      }
      await this.fetchIndicators();
    },
    toggleSortingDropdown() {
      this.showSortingDropdown = !this.showSortingDropdown;
    },
    setDatacubeSort(option: string) {
      this.selectedSortingOption = option;
      this.showSortingDropdown = false;
    }
  }
});
</script>

<style lang="scss" scoped>
@import "@/styles/variables";

$padding-size: 3vh;
.dataset-overview-container {
  display: flex;
  flex-direction: column;
  height: $content-full-height;
}

header {
  height: 25vh;
  display: flex;
  padding: 20px 20px 0;
}

.metadata-column {
  flex: 1;
  min-width: 0;
  overflow: hidden;

  h3 {
    margin: 0;
  }

  & > *:not(:first-child) {
    margin-top: 1px;
  }

  .description {
    max-width: 90ch;
  }
}

.edit-desc {
  border-width: 1px;
  border-color: rgb(216, 214, 214);
  min-width: 100%;
  flex-basis: 100%;
}

.tags-column {
  width: 20vw;
  display: flex;
  flex-wrap: wrap;
  align-self: flex-start;

  strong {
    align-self: center;
    margin-right: 5px;
  }
}

.info-column {
  margin-left: 10px;
  width: 30vw;
  display: flex;
  flex-direction: column;
}

.tag {
  margin: 2px;
  padding: 4px;
  border-style: solid;
  border-width: thin;
  border-color: darkgrey;
  background-color: lightgray;
  border-radius: 4px;
}

.column-title {
  font-size: x-large;
  padding-right: 4px;
}

main {
  flex: 1;
  min-height: 0;
  padding: 20px;
  display: flex;
}

.insights-column {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.insights {
  background: white;
  // Pane already contains bottom margin
  padding: 10px 10px 0;
  margin-top: 18px;
  flex: 1;
  min-height: 0;
}

.instance-list-column {
  flex: 3;
  display: flex;
  flex-direction: column;
  margin-left: 10px;
}

.instance-list-header {
  display: flex;
  justify-content: space-between;
}

.instance-list {
  margin-top: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.max-content-height {
  height: 60vh;
}

.registerer {
  background-color: lightgrey;
  border-style: solid;
  border-width: 1px;
  border-color: darkgrey;
  padding-left: 5px;
  padding-right: 5px;
  margin: 5px;
}

.row {
  padding-left: $padding-size;
  padding-right: $padding-size;
}

.header-prompt {
  font-weight: normal;
  font-size: 28px;
  margin-top: 0;
  text-align: center;
}

.descriptions {
  display: flex;
  font-size: large;
}

.descriptions {
  margin: 3vh 0;

  & > p {
    color: #747576;
    width: 100%;
  }
}

.cards > .overview-card-container:not(:first-child),
.descriptions > p:not(:first-child) {
  margin-left: 6.25vh;
}

.projects-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  .projects-list-elements {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
}

.title {
  display: flex;
  align-items: center;
  div {
    flex: 1;
  }
  .btn-primary {
    margin: 20px 5px 10px;
  }
}

.filter-options {
  display: flex;
  margin-top: 10px;

  .filter-label {
    margin: 0;
    padding-left: 0;
    padding-right: 10px;
    font-weight: unset;
    cursor: pointer;
    color: black;
  }
}

.controls {
  display: flex;
  justify-content: space-between;
  input[type=text] {
    padding: 8px;
    width: 150px;
    margin-right: 5px;
  }
  .sorting {
    position: relative;
    .btn {
      width: 180px !important;
      text-align: left;
      .lbl {
        font-weight: normal;
      }
      .fa {
        position:absolute;
        right: 20px;
      }
    }
    .dropdown {
      position: absolute;
      width: 100%;
    }
  }
  .form-control {
    background: #fff;
  }
}
</style>
