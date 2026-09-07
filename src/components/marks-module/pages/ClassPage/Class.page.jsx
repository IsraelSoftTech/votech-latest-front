import "./Class.styles.css";
import React, { useState, useEffect } from "react";
import SideTop from "../../../SideTop";
import DataTable from "../../components/DataTable/DataTable.component";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import { ClassFormModal } from "../../components/ClassFormModal/ClassFormModal.component";
import Stats from "../../components/Stats/Stats.component";
import { PageHeader } from "../../components/PageHeader/PageHeader.component";
import { useNavigate } from "react-router-dom";
import { FaBan, FaCheckCircle, FaLayerGroup, FaPlus } from "react-icons/fa";
import {
  EMPTY_CLASS_FORM,
  classToForm,
  confirmOrientationNameMismatch,
  transformClassForm,
  validateClassForm,
} from "../../utils/classForm.util";

export const ClassPage = () => {
  const navigate = useNavigate();

  // Admin1 can see this list (name/department/class master/fees) and can
  // still Edit/Delete a class from here, but the full detail page
  // (Overview/Students/Subjects/Teachers/Class Master tabs) is Admin3-only
  // — rather than send Admin1 into a page that immediately bounces them to
  // /unauthorized, the row simply isn't a link for them at all (see
  // DataTable's no-row-click styling below).
  let currentRole = null;
  try {
    currentRole = JSON.parse(sessionStorage.getItem("authUser") || "null")?.role || null;
  } catch (err) {
    currentRole = null;
  }
  const canOpenClassDetail = currentRole === "Admin3";

  const columns = [
    { label: "S/N", accessor: "sn" },
    { label: "Name", accessor: "name" },
    { label: "Department", accessor: "department" },
    { label: "Class Master", accessor: "classMaster" },
    { label: "Status", accessor: "suspended" },
    { label: "Orientation", accessor: "orientationLabel" },
    { label: "Tuition Fee", accessor: "tuition_fee" },
    { label: "PTA Fee", accessor: "pta_fee" },
    { label: "Total Fee", accessor: "total_fee" },
  ];

  const [data, setData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState([]);
  const [stats, setStats] = useState([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [form, setForm] = useState(EMPTY_CLASS_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Helpers
  const handleUpdateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const resetForm = () => {
    setForm(EMPTY_CLASS_FORM);
    setFormErrors({});
  };

  // Fetch initial data
  const fetchClasses = async () => {
    try {
      setIsLoading(true);
      const subFilters = new Set();
      const res = await api.get("/classes");
      if (res.data?.data) {
        const formatted = res.data.data.map((el, index) => {
          subFilters.add(el.department?.name);
          return {
            ...el,
            sn: index + 1,
            department: el.department?.name || "-",
            classMaster: el.classMaster
              ? el.classMaster?.name || el.classMaster.username
              : "-",
            suspended: el.suspended ? "Suspended" : "Active",
            orientationLabel: el.is_orientation ? "Yes" : "No",
            registration_fee: el.registration_fee
              ? Number(el.registration_fee).toLocaleString("fr-CM")
              : "-",
            bus_fee: el.bus_fee
              ? Number(el.bus_fee).toLocaleString("fr-CM")
              : "-",
            internship_fee: el.internship_fee
              ? Number(el.internship_fee).toLocaleString("fr-CM")
              : "-",
            remedial_fee: el.remedial_fee
              ? Number(el.remedial_fee).toLocaleString("fr-CM")
              : "-",
            tuition_fee: el.tuition_fee
              ? Number(el.tuition_fee).toLocaleString("fr-CM")
              : "-",
            pta_fee: el.pta_fee
              ? Number(el.pta_fee).toLocaleString("fr-CM")
              : "-",
            total_fee: el.total_fee
              ? Number(el.total_fee).toLocaleString("fr-CM")
              : "-",
          };
        });
        const actualFilters = [];

        subFilters.forEach((filter) => {
          actualFilters.push(filter);
        });
        setFilters(actualFilters);
        setData(formatted);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to load academic years."
      );
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get("/teachers");

      const data = !res.data.data
        ? []
        : res.data.data.map((teach, index) => {
            return {
              value: teach.id,
              label: teach.name || teach.username || `Teacher ${index}`,
            };
          });

      setTeachers(data);
    } catch (err) {
      toast.error(err?.response?.data.details || "Error fetching classes.");
      console.log(err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${subBaseURL}/specialties`, {
        headers: headers(),
      });

      const data = (await res.json()).map((dep) => ({
        value: dep.id,
        label: dep.name,
      }));
      setDepartments(data);
    } catch (err) {
      toast.error("Error fetching departments.");
      console.log(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/content/classes");
      const icons = [FaLayerGroup, FaCheckCircle, FaBan];

      res.data.data.stats.forEach((data, index) => {
        data.icon = icons[index];
      });
      setStats(res.data.data.stats);
    } catch (err) {
      toast.error(err?.response?.data?.details || "Error fetching statistics");
      console.log(err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchDepartments();
    fetchTeachers();
    fetchStats();
  }, []);

  // CRUD Requests
  const createClass = async () => {
    try {
      setCreateLoading(true);
      await api.post("/classes", transformClassForm(form));
      toast.success("Class created successfully.");
      closeCreateModal();
      fetchClasses();
      fetchStats();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to create class."
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const editClass = async () => {
    try {
      setEditLoading(true);
      await api.patch(`/classes/${form.id}`, transformClassForm(form));
      toast.success("Class updated successfully.");
      closeEditModal();
      fetchClasses();
      fetchStats();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to update class."
      );
    } finally {
      setEditLoading(false);
    }
  };

  const deleteClass = async (row) => {
    try {
      await api.delete(`/classes/${row.id}`);
      toast.success("Class deleted successfully.");
      fetchClasses();
      fetchStats();
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Delete failed."
      );
    }
  };

  // Form handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = validateClassForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    if (!confirmOrientationNameMismatch(form)) return;
    createClass();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errors = validateClassForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    if (!confirmOrientationNameMismatch(form)) return;
    editClass();
  };

  // Fetches the raw class record instead of reusing the table row: the
  // table's `data` has already run every fee through .toLocaleString()
  // for display (e.g. "50,000"), and transformClassForm's Number(...) on
  // a comma-formatted string is NaN, silently zeroing every fee on save.
  const handleEdit = async (row) => {
    try {
      const res = await api.get(`/classes/${row.id}`);
      const cls = res.data?.data;
      if (!cls) throw new Error("Class not found");
      setForm(classToForm(cls));
      setEditModalOpen(true);
    } catch (err) {
      toast.error(
        err.response?.data?.details ||
          err.response?.data?.message ||
          "Failed to load class for editing."
      );
    }
  };

  const closeCreateModal = () => {
    resetForm();
    setCreateModalOpen(false);
  };

  const closeEditModal = () => {
    resetForm();
    setEditModalOpen(false);
  };

  const handleRowClick = (row) => navigate(`/academics/classes/${row.id}`);

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  return (
    <SideTop>
      <div className="class-page">
        <PageHeader
          title="Classes"
          actions={
            <button
              className="class-btn-create class-btn-desktop"
              onClick={openCreateModal}
            >
              <FaPlus />
              <span>Create Class</span>
            </button>
          }
        />

        <Stats data={stats} loading={isLoading} skeletonCount={3} />

        {/* Mobile FAB */}
        <button
          className="class-btn-create class-btn-mobile-fab"
          onClick={openCreateModal}
          aria-label="Create Class"
        >
          <FaPlus />
        </button>

        <div className="class-table-container">
          <DataTable
            columns={columns}
            data={data}
            onEdit={handleEdit}
            onDelete={deleteClass}
            loading={isLoading}
            limit={12}
            onRowClick={canOpenClassDetail ? handleRowClick : undefined}
            warnDelete={() => {}}
            filterCategories={filters}
          />
        </div>

        <ClassFormModal
          mode="create"
          isOpen={createModalOpen}
          onClose={closeCreateModal}
          form={form}
          formErrors={formErrors}
          onChange={handleUpdateForm}
          onSubmit={handleCreateSubmit}
          departments={departments}
          teachers={teachers}
          loading={createLoading}
        />

        <ClassFormModal
          mode="edit"
          isOpen={editModalOpen}
          onClose={closeEditModal}
          form={form}
          formErrors={formErrors}
          onChange={handleUpdateForm}
          onSubmit={handleEditSubmit}
          departments={departments}
          teachers={teachers}
          loading={editLoading}
        />
      </div>
    </SideTop>
  );
};
