<template>
  <q-page class="row items-start justify-evenly q-pt-md">
    <div
      v-if="!cells.length"
      class="q-pt-md text-center"
    >
      <q-icon
        :name="icons.noCells"
        style="opacity: 20%;"
        class="q-py-md"
        size="10em"
      />

      <p>
        No cells were found in your database. Scan a new cell to get started.
      </p>
    </div>

    <q-table
      v-else
      title="Cells"
      :data="cells"
      :columns="columns"
      row-key="id"
      :filter="filter"
      :pagination="{
        sortBy: 'desc',
        descending: false,
        rowsPerPage: this.$q.screen.xs ? 10 : 15,
      }"
      @row-click="onRowClick"
    >
      <template v-slot:top-right>
        <q-input
          borderless
          dense
          debounce="300"
          v-model="filter"
          placeholder="Search"
        >
          <template v-slot:append>
            <q-icon name="mdi-magnify" />
          </template>
        </q-input>
      </template>
    </q-table>
  </q-page>
</template>

<script lang="ts" >
import { defineComponent } from "@vue/composition-api";
import { date } from "quasar";
import { ICell, ICellType } from "../../../backend/src/models/Cell";
import icons from "../icons";

export default defineComponent({
  name: "CellDatabase",
  data() {
    return {
      filter: "",
      columns: [
        {
          name: "id", align: "center", label: "Cell ID", field: "id", sortable: true
        },
        {
          name: "type",
          label: "Type",
          field: "cellType",
          sortable: true,
          format: (val: ICellType) => val?.name
        },
        {
          name: "class", label: "Class", field: "class", sortable: true
        },
        {
          name: "state", label: "State", field: "state", sortable: true
        },
        {
          name: "created", label: "Created Date", field: "created", format: (val: number) => date.formatDate(val * 1000, "DD/MM/YY")
        }
      ],
      cells: [] as Array<ICell>
    };
  },
  mounted() {
    this.retrieveCells();
  },

  watch: {
    httpBaseUrl() {
      this.retrieveCells();
    }
  },
  computed: {
    icons() {
      return icons;
    },
    gridMode() {
      return this.$q.screen.lt.sm;
    }
  },
  methods: {
    retrieveCells() {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.$axios.get("/api/cells/").then((result) => {
        this.cells = result.data as Array<ICell>;
      });
    },
    onRowClick(evt: InputEvent, row: ICell) {
      this.$router.push({ name: "editCell", params: { cellId: String(row.id) } }).catch(() => {});
    }
  }
});
</script>
