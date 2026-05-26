// Shared helpers for Vercel-style serverless function testing

export function mockReq(body = {}, method = "POST") {
  return { method, body };
}

export function mockRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      this._body = data;
      return this;
    },
    end() {
      return this;
    },
    setHeader(name, value) {
      this._headers[name] = value;
      return this;
    },
  };
  return res;
}

export function minimalOnboardingRecord(overrides = {}) {
  return {
    phoneNumber: "+6591234567",
    type: "onboarding",
    submitted: false,
    submittedAt: null,
    approved: false,
    approvedAt: null,
    rejected: false,
    rejectionReason: "",
    sections: [],
    ...overrides,
  };
}
