<?php

namespace Workdo\Hrm\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

class SystemSetupController extends Controller
{
    public function index(Request $request)
    {
        if (Auth::user()->can('manage-branches')) {
            return redirect()->route('hrm.branches.index');
        }
        if (Auth::user()->can('manage-departments')) {
            return redirect()->route('hrm.departments.index');
        }
        if (Auth::user()->can('manage-designations')) {
            return redirect()->route('hrm.designations.index');
        }

        return back()->with('error', __('Permission denied'));
    }
}
