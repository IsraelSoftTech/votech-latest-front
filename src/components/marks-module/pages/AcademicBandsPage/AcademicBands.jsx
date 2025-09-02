import "./AcademicBands.styles.css";
import React, { useState, useEffect } from "react";
import SideTop from "../../../SideTop";
import Modal from "../../components/Modal/Modal.component";
import { toast } from "react-toastify";
import api, { headers, subBaseURL } from "../../utils/api";
import Select from "react-select";
import { CustomInput, SubmitBtn } from "../../components/Inputs/CustumInputs";
import { FaLock } from "react-icons/fa";

export const AcademicBandsPage = () => {
  const isReadOnly = JSON.parse(sessionStorage.getItem('authUser') || '{}').role === 'Admin1';
  
  const [data, setData] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [form, setForm] = useState({
    academic_year_id: null,
    department_id: null,
    class_id: null,
    bands: [],
  });

  const [filters, setFilters] = useState({
    academic_year_id: null,
    department_id: null,
    class_id: null,
    search: "", // single search bar
  });

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${subBaseURL}/specialties`, {
        headers: headers(),
      });
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      toast.error("Error fetching departments.");
      console.log(err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bandsRes, yearsRes, classesRes] = await Promise.all([
        api.get("/academic-bands"),
        api.get("/academic-years"),
        api.get("/classes"),
      ]);
      if (fetchDepartments) await fetchDepartments();

      setAcademicYears(yearsRes?.data?.data || []);
      setClasses(classesRes?.data?.data || []);
      setData(groupBands(bandsRes?.data?.data || []));
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function groupBands(bands) {
    const grouped = {};

    bands.forEach((b) => {
      const yearId = b.academic_year_id;
      const deptId = b.class.department_id;
      const classId = b.class_id;

      if (!grouped[yearId])
        grouped[yearId] = { year: b.academic_year, departments: {} };
      if (!grouped[yearId].departments[deptId])
        grouped[yearId].departments[deptId] = {
          department: b.class.department,
          classes: {},
        };
      if (!grouped[yearId].departments[deptId].classes[classId])
        grouped[yearId].departments[deptId].classes[classId] = {
          class: b.class,
          bands: [],
        };

      grouped[yearId].departments[deptId].classes[classId].bands.push({
        id: b.id,
        band_min: b.band_min,
        band_max: b.band_max,
        comment: b.comment,
      });
    });

    return Object.values(grouped).map((y) => ({
      academic_year_id: y?.year?.id,
      year: y.year,
      departments: Object.values(y.departments).map((d) => ({
        id: d.department.id,
        department: d.department,
        classes: Object.values(d.classes).map((c) => ({
          id: c.class.id,
          class: c.class,
          bands: c.bands,
        })),
      })),
    }));
  }

  const handleBandChange = (index, key, value) => {
    setForm((prev) => {
      const newBands = [...prev.bands];
      newBands[index][key] = key === "comment" ? value : Number(value);
      return { ...prev, bands: newBands };
    });
  };

  const addBandRow = () =>
    setForm((prev) => ({
      ...prev,
      bands: [...prev.bands, { band_min: "", band_max: "", comment: "" }],
    }));

  const removeBandRow = (index) =>
    setForm((prev) => {
      const newBands = [...prev.bands];
      newBands.splice(index, 1);
      return { ...prev, bands: newBands };
    });

  const validateForm = () => {
    const errors = [];
    if (!form.academic_year_id || !form.department_id || !form.class_id)
      errors.push("Select academic year, department, and class.");

    form.bands.forEach((b, i) => {
      if (b.band_min === "" || b.band_max === "")
        errors.push(`Band ${i + 1} min/max required`);
      if (!b.comment) errors.push(`Band ${i + 1} comment required`);
      if (b.band_max < b.band_min)
        errors.push(`Band ${i + 1} max may not be less than min`);
    });

    if (errors.length) {
      toast.error(errors[0]);
      return false;
    }
    return true;
  };

  const flattenBandsPayload = ({ bands, ...rest }) => {
    if (!bands || !Array.isArray(bands) || bands.length === 0) return rest;
    return { ...rest, ...bands[0] };
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const payload = flattenBandsPayload(form);
      await api.post("/academic-bands/save", form);
      toast.success("Bands saved successfully");
      setCreateModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.details || "Failed to save bands.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!form.academic_year_id || !form.department_id || !form.class_id) return;

    const existing = data
      .find((y) => y.academic_year_id === form.academic_year_id)
      ?.departments.find((d) => d.id === form.department_id)
      ?.classes.find((c) => c.id === form.class_id)?.bands;

    if (existing && existing.length) {
      setForm((prev) => ({ ...prev, bands: existing.map((b) => ({ ...b })) }));
    } else {
      setForm((prev) => ({
        ...prev,
        bands: [{ band_min: "", band_max: "", comment: "" }],
      }));
    }
  }, [form.academic_year_id, form.department_id, form.class_id, data]);

  const filteredClasses = form.department_id
    ? classes.filter((c) => c.department_id === form.department_id)
    : [];

  const filteredData = data
    .filter(
      (y) =>
        !filters.academic_year_id ||
        y.academic_year_id === filters.academic_year_id
    )
    .map((y) => ({
      ...y,
      departments: y.departments
        .filter((d) => !filters.department_id || d.id === filters.department_id)
        .map((d) => ({
          ...d,
          classes: d.classes
            .filter((c) => !filters.class_id || c.id === filters.class_id)
            .map((c) => ({
              ...c,
              bands: c.bands.filter((b) => {
                const search = filters.search.trim().toLowerCase();
                if (!search) return true;
                return (
                  b.band_min.toString().includes(search) ||
                  b.band_max.toString().includes(search) ||
                  b.comment.toLowerCase().includes(search)
                );
              }),
            }))
            .filter((c) => c.bands.length > 0),
        }))
        .filter((d) => d.classes.length > 0),
    }))
    .filter((y) => y.departments.length > 0);

  return (
    <SideTop>
      <div className="academic-bands-page">
        <div className="page-header">
          <h2>
            Academic Bands
            {isReadOnly && (
              <span className="read-only-badge">
                <FaLock /> Read Only
              </span>
            )}
          </h2>
          {!isReadOnly && (
            <button
              className="btn btn-primary"
              onClick={() => setCreateModalOpen(true)}
            >
              Add / Edit Academic Bands
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="skeleton-container">
            {" "}
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-year-block">
                {" "}
                <div
                  className="skeleton skeleton-text"
                  style={{ width: "200px", height: "24px" }}
                />{" "}
                {[1, 2].map((j) => (
                  <div key={j} className="skeleton-department-block">
                    {" "}
                    <div
                      className="skeleton skeleton-text"
                      style={{ width: "150px", height: "20px" }}
                    />{" "}
                    {[1, 2].map((k) => (
                      <div key={k} className="skeleton-class-block">
                        {" "}
                        <div
                          className="skeleton skeleton-text"
                          style={{ width: "180px", height: "18px" }}
                        />{" "}
                        <div className="skeleton-table">
                          {" "}
                          {[1, 2, 3].map((r) => (
                            <div key={r} className="skeleton-row">
                              {" "}
                              <div
                                className="skeleton"
                                style={{ width: "50px", height: "16px" }}
                              />{" "}
                              <div
                                className="skeleton"
                                style={{ width: "50px", height: "16px" }}
                              />{" "}
                              <div
                                className="skeleton"
                                style={{ width: "120px", height: "16px" }}
                              />{" "}
                            </div>
                          ))}{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                  </div>
                ))}{" "}
              </div>
            ))}{" "}
          </div>
        ) : (
          <>
            <div className="filters-row">
              <div className="form-react-select">
                <Select
                  placeholder="Filter Academic Year"
                  options={academicYears.map((y) => ({
                    value: y.id,
                    label: y.name,
                  }))}
                  value={
                    filters.academic_year_id
                      ? {
                          value: filters.academic_year_id,
                          label: academicYears.find(
                            (y) => y.id === filters.academic_year_id
                          )?.name,
                        }
                      : null
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      academic_year_id: opt?.value || null,
                    }))
                  }
                  isClearable
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Filter Department"
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  value={
                    departments.find((d) => d.id === filters.department_id) && {
                      value: filters.department_id,
                      label: departments.find(
                        (d) => d.id === filters.department_id
                      )?.name,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      department_id: opt?.value || null,
                    }))
                  }
                  isClearable
                />
              </div>

              <div className="form-react-select">
                <Select
                  placeholder="Filter Class"
                  options={classes.map((c) => ({
                    value: c.id,
                    label: `${c.department?.name || "No Dept"} - ${c.name}`,
                  }))}
                  value={
                    classes.find((c) => c.id === filters.class_id) && {
                      value: filters.class_id,
                      label: `${
                        classes.find((c) => c.id === filters.class_id)
                          ?.department?.name || "No Dept"
                      } - ${
                        classes.find((c) => c.id === filters.class_id)?.name
                      }`,
                    }
                  }
                  onChange={(opt) =>
                    setFilters((prev) => ({
                      ...prev,
                      class_id: opt?.value || null,
                    }))
                  }
                  isClearable
                />
              </div>

              <CustomInput
                label="Search Bands"
                type="text"
                placeholder="Search min, max, or comment"
                value={filters.search}
                onChange={(_, val) =>
                  setFilters((prev) => ({ ...prev, search: val }))
                }
                style={{ width: "300px" }}
              />

              <button
                className="btn btn-secondary"
                onClick={() =>
                  setFilters({
                    academic_year_id: null,
                    department_id: null,
                    class_id: null,
                    search: "",
                  })
                }
              >
                Clear Filters
              </button>
            </div>

            <div className="bands-table-wrapper">
              {filteredData.map((yearData) => {
                if (!yearData.year?.name) return null;
                return (
                  <div key={yearData.academic_year_id} className="year-block">
                    <h3>{yearData.year.name}</h3>
                    {yearData.departments.map((dept) => {
                      if (!dept.department) return null;
                      return (
                        <div key={dept.id} className="department-block">
                          <h4>{dept.department.name}</h4>
                          {dept.classes.map((cls) => {
                            if (!cls.class) return null;
                            return (
                              <div key={cls.id} className="class-block">
                                <h5>{`${cls.class.name} (${dept.department.name})`}</h5>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Min</th>
                                      <th>Max</th>
                                      <th>Comment</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cls.bands.map((b, idx) => (
                                      <tr key={idx}>
                                        <td>{b.band_min}</td>
                                        <td>{b.band_max}</td>
                                        <td>{b.comment}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Add / Edit Academic Bands"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="bands-form"
          >
            <div className="form-react-select">
              <Select
                placeholder="Select Academic Year"
                options={academicYears.map((y) => ({
                  value: y.id,
                  label: y.name,
                }))}
                value={
                  academicYears.find((y) => y.id === form.academic_year_id) && {
                    value: form.academic_year_id,
                    label: academicYears.find(
                      (y) => y.id === form.academic_year_id
                    )?.name,
                  }
                }
                onChange={(opt) =>
                  setForm((prev) => ({
                    ...prev,
                    academic_year_id: opt?.value || null,
                  }))
                }
              />
            </div>

            <div className="form-react-select">
              <Select
                placeholder="Select Department"
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
                value={
                  departments.find((d) => d.id === form.department_id) && {
                    value: form.department_id,
                    label: departments.find((d) => d.id === form.department_id)
                      ?.name,
                  }
                }
                onChange={(opt) =>
                  setForm((prev) => ({
                    ...prev,
                    department_id: opt?.value || null,
                    class_id: null,
                  }))
                }
              />
            </div>

            <div className="form-react-select">
              <Select
                placeholder="Select Class"
                options={filteredClasses.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${
                    departments.find((d) => d.id === c.department_id)?.name
                  })`,
                }))}
                value={
                  filteredClasses.find((c) => c.id === form.class_id) && {
                    value: form.class_id,
                    label: `${
                      filteredClasses.find((c) => c.id === form.class_id)?.name
                    } (${
                      departments.find((d) => d.id === form.department_id)?.name
                    })`,
                  }
                }
                onChange={(opt) =>
                  setForm((prev) => ({ ...prev, class_id: opt?.value || null }))
                }
              />
            </div>

            {form.bands.map((b, idx) => (
              <div key={idx} className="band-row">
                <CustomInput
                  label="Min"
                  type="number"
                  value={b.band_min}
                  onChange={(_, val) => handleBandChange(idx, "band_min", val)}
                />
                <CustomInput
                  label="Max"
                  type="number"
                  value={b.band_max}
                  onChange={(_, val) => handleBandChange(idx, "band_max", val)}
                />
                <CustomInput
                  label="Comment"
                  type="text"
                  value={b.comment}
                  onChange={(_, val) => handleBandChange(idx, "comment", val)}
                />
                <button
                  type="button"
                  className="btn btn-delete"
                  onClick={() => removeBandRow(idx)}
                >
                  Remove
                </button>
              </div>
            ))}

            <button type="button" className="btn btn-add" onClick={addBandRow}>
              Add Band Row
            </button>
            <SubmitBtn title="Save Bands" loading={saving} />
          </form>
        </Modal>
      </div>
    </SideTop>
  );
};
