"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const boom_1 = __importDefault(require("@hapi/boom"));
const Cell_1 = require("../../models/Cell");
const get = async (request) => {
    const cell = await Cell_1.Cell.findOne(request.params.id);
    if (!cell)
        throw boom_1.default.notFound();
    return cell;
};
const put = async (request) => {
    const cell = await Cell_1.Cell.findOne(request.params.id);
    if (!cell)
        throw boom_1.default.notFound();
    const cellPayload = request.payload;
    cell.class = cellPayload.class;
    cell.state = Cell_1.Cell.CellState[cellPayload.state];
    cell.save();
    return cell;
};
const remove = async (request) => {
    const cell = await Cell_1.Cell.findOne(request.params.id);
    if (!cell)
        throw boom_1.default.notFound();
    cell.softRemove();
    return cell;
};
exports.default = { get, put, remove };
//# sourceMappingURL=cell.js.map