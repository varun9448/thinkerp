<?php

namespace Workdo\Account\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class UpiSettingsController extends Controller
{
    public function index()
    {
        abort_if(!Auth::user()->can('manage-account'), 403);

        return Inertia::render('Account/Settings/UpiSettings', [
            'upiSettings' => [
                'enabled'  => getSetting('upi_enabled') ?? 'off',
                'upi_id'   => getSetting('upi_id') ?? '',
                'upi_name' => getSetting('upi_name') ?? '',
            ],
        ]);
    }

    public function store(Request $request)
    {
        abort_if(!Auth::user()->can('manage-account'), 403);

        $validated = $request->validate([
            'enabled'  => 'required|in:on,off',
            'upi_id'   => 'required_if:enabled,on|nullable|string|max:100|regex:/^[a-zA-Z0-9.\-_]+@[a-zA-Z]+$/',
            'upi_name' => 'required_if:enabled,on|nullable|string|max:100',
        ], [
            'upi_id.regex'            => __('UPI ID must be in format: yourname@bankname (e.g. business@ybl)'),
            'upi_id.required_if'      => __('UPI ID is required when UPI payments are enabled.'),
            'upi_name.required_if'    => __('Display name is required when UPI payments are enabled.'),
        ]);

        setSetting('upi_enabled', $validated['enabled'], creatorId());
        setSetting('upi_id',      $validated['upi_id'] ?? '',   creatorId());
        setSetting('upi_name',    $validated['upi_name'] ?? '', creatorId());

        return back()->with('success', __('UPI settings saved successfully.'));
    }
}
