import React from "react";
import { createRoot } from "react-dom/client";
import ReportCard from "./ReportCard";

const payload = window.__PAYLOAD__ || {};
const { data, grading } = payload;

createRoot(document.getElementById("root")).render(
  <ReportCard data={data} grading={grading} disableAutoScale={true} />
);
